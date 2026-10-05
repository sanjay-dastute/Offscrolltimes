import { createRazorpayRefund, RazorpayApiError, retrieveRazorpayPayment } from '#/lib/razorpay.server'
import { recordAccountEvent } from '#/lib/customer/store.server'

const WINDOW_MS = 48 * 60 * 60 * 1000

export class RefundRequestError extends Error {
  constructor(message:string, public readonly status=409) { super(message) }
}

export async function requestFullRazorpayRefund(db:D1Database,input:{subscriptionId:string; ownerId?:string; actorId:string; source:'customer'|'administrator'; now?:number}) {
  const now=input.now??Date.now()
  const row=await db.prepare(`SELECT p.id payment_id,p.provider_payment_id,p.amount_minor,p.currency,p.paid_at,p.status payment_status,
    s.owner_id,s.status subscription_status FROM customer_payments p JOIN customer_subscriptions s ON s.id=p.subscription_id
    WHERE p.subscription_id=? AND p.status='paid' ${input.ownerId?'AND s.owner_id=?':''} ORDER BY p.paid_at DESC LIMIT 1`)
    .bind(...(input.ownerId?[input.subscriptionId,input.ownerId]:[input.subscriptionId])).first<{payment_id:string;provider_payment_id:string|null;amount_minor:number;currency:string;paid_at:number|null;payment_status:string;owner_id:string;subscription_status:string}>()
  if(!row) throw new RefundRequestError('No refundable paid payment was found.',404)
  if(!row.provider_payment_id || !row.paid_at || now-row.paid_at > WINDOW_MS) throw new RefundRequestError('The 48-hour refund window has closed.')
  const existing=await db.prepare(`SELECT id FROM refunds WHERE payment_id=? AND provider_status IN ('requested','processing','processed') LIMIT 1`).bind(row.payment_id).first()
  if(existing) throw new RefundRequestError('A refund is already being processed for this payment.')
  let payment:Record<string,any>
  try { payment=await retrieveRazorpayPayment(row.provider_payment_id) } catch(error) { if(error instanceof RazorpayApiError) throw new RefundRequestError(error.status===401?'Razorpay credentials were rejected.':'Razorpay could not confirm this payment. Try again shortly.',error.status===401?401:502); throw error }
  if(payment.status!=='captured' || payment.amount!==row.amount_minor || payment.currency!==row.currency) throw new RefundRequestError('This payment is not eligible for a Razorpay refund.')
  let refund:Record<string,any>
  try { refund=await createRazorpayRefund(row.provider_payment_id,row.amount_minor,{subscription_id:input.subscriptionId,requested_by:input.source}) } catch(error) { if(error instanceof RazorpayApiError) throw new RefundRequestError('Razorpay could not create the refund. No payment state was changed.',502); throw error }
  if(typeof refund.id!=='string') throw new RefundRequestError('Razorpay returned an invalid refund response.',502)
  if(refund.status==='failed') throw new RefundRequestError('Razorpay declined the refund. No subscription state was changed.',502)
  const providerStatus=refund.status==='processed'?'processed':refund.status==='failed'?'failed':'processing'
  await db.prepare(`INSERT INTO refunds(id,payment_id,subscription_id,provider_refund_id,amount_minor,currency,reason,provider_status,entitlement_effect,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'full_refund_requested',?,?)`)
    .bind(`razorpay_${refund.id}`,row.payment_id,input.subscriptionId,refund.id,row.amount_minor,row.currency,`48-hour ${input.source} refund`,providerStatus,now,now).run()
  await db.prepare(`UPDATE customer_subscriptions SET status=?,entitlement_status=?,renewal_enabled=0,updated_at=? WHERE id=?`).bind(providerStatus==='processed'?'refunded':'cancelled',providerStatus==='processed'?'refunded':'exhausted',now,input.subscriptionId).run()
  if(providerStatus==='processed') await db.prepare(`UPDATE customer_payments SET status='refunded',updated_at=? WHERE id=?`).bind(now,row.payment_id).run()
  await recordAccountEvent(db,{userId:row.owner_id,subscriptionId:input.subscriptionId,eventType:providerStatus==='processed'?'refund_processed':'refund_requested',title:providerStatus==='processed'?'Refund processed':'Refund requested',detail:providerStatus==='processed'?'Razorpay confirmed your full refund.':'Your full Razorpay refund is being processed.',now})
  return {status:providerStatus,refundId:refund.id}
}
