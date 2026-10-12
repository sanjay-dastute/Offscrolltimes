import { cancelRazorpaySubscription, createRazorpayRefund, RazorpayApiError, retrieveRazorpayPayment } from '#/lib/razorpay.server'
import { recordAccountEvent } from '#/lib/customer/store.server'

const WINDOW_MS = 48 * 60 * 60 * 1000

export class RefundRequestError extends Error {
  constructor(message:string, public readonly status=409) { super(message) }
}

export async function requestFullRazorpayRefund(db:D1Database,input:{subscriptionId:string;paymentId?:string; ownerId?:string; actorId:string; source:'customer'|'administrator'; amountMinor?:number; now?:number}) {
  const now=input.now??Date.now()
  const row=await db.prepare(`SELECT p.id payment_id,p.provider_payment_id,p.amount_minor,p.currency,p.paid_at,p.status payment_status,
    s.owner_id,s.status subscription_status FROM customer_payments p JOIN customer_subscriptions s ON s.id=p.subscription_id
    WHERE p.subscription_id=? AND p.status='paid' ${input.ownerId?'AND s.owner_id=?':''} ${input.paymentId?'AND p.id=?':''} ORDER BY p.paid_at DESC LIMIT 1`)
    .bind(input.subscriptionId,...(input.ownerId?[input.ownerId]:[]),...(input.paymentId?[input.paymentId]:[])).first<{payment_id:string;provider_payment_id:string|null;amount_minor:number;currency:string;paid_at:number|null;payment_status:string;owner_id:string;subscription_status:string}>()
  if(!row) throw new RefundRequestError('No refundable paid payment was found.',404)
  if(!row.provider_payment_id) throw new RefundRequestError('The Razorpay payment reference is missing.')
  if(input.source==='customer'&&(!input.ownerId||!row.paid_at||now-row.paid_at>=WINDOW_MS)) throw new RefundRequestError('The 48-hour refund window has closed.')
  const amount=input.amountMinor??row.amount_minor
  if(!Number.isSafeInteger(amount)||amount<1||amount>row.amount_minor)throw new RefundRequestError('Enter a refund amount greater than zero and no greater than the payment.',422)
  if(input.source==='customer'&&amount!==row.amount_minor)throw new RefundRequestError('Customers can request only a full refund.',422)
  const existing=await db.prepare(`SELECT id FROM refunds WHERE payment_id=? AND provider_status IN ('requested','processing','processed') LIMIT 1`).bind(row.payment_id).first()
  if(existing) throw new RefundRequestError('A refund is already being processed for this payment.')
  let payment:Record<string,any>
  try { payment=await retrieveRazorpayPayment(row.provider_payment_id) } catch(error) { if(error instanceof RazorpayApiError) throw new RefundRequestError(error.status===401?'Razorpay credentials were rejected.':'Razorpay could not confirm this payment. Try again shortly.',error.status===401?401:502); throw error }
  if(payment.status!=='captured' || payment.amount!==row.amount_minor || payment.currency!==row.currency) throw new RefundRequestError('This payment is not eligible for a Razorpay refund.')
  if(Number(payment.amount_refunded||0)>0)throw new RefundRequestError('This payment already has a refund. Review it in Razorpay before requesting another.')
  const recurring=await db.prepare('SELECT razorpay_subscription_id,status FROM razorpay_recurring_subscriptions WHERE subscription_id=?').bind(input.subscriptionId).first<{razorpay_subscription_id:string;status:string}>()
  if(recurring&&!['cancelled','completed','expired'].includes(recurring.status)){
    try{await cancelRazorpaySubscription(recurring.razorpay_subscription_id,true)}catch{throw new RefundRequestError('Razorpay could not cancel automatic renewal. No refund was requested; please retry.',502)}
    await db.prepare("UPDATE razorpay_recurring_subscriptions SET status='cancelled',updated_at=? WHERE subscription_id=?").bind(now,input.subscriptionId).run()
    await db.prepare("UPDATE customer_subscriptions SET renewal_enabled=0,updated_at=? WHERE id=?").bind(now,input.subscriptionId).run()
  }
  const claim=await db.prepare('INSERT OR IGNORE INTO refund_attempts(payment_id,subscription_id,amount_minor,actor_id,created_at) VALUES(?,?,?,?,?)').bind(row.payment_id,input.subscriptionId,amount,input.actorId,now).run()
  if(!claim.meta.changes)throw new RefundRequestError('A refund request already exists. Check its status before trying again.')
  let refund:Record<string,any>
  try { refund=await createRazorpayRefund(row.provider_payment_id,amount,{subscription_id:input.subscriptionId,requested_by:input.source}) } catch(error) { if(error instanceof RazorpayApiError){if(error.status>=400&&error.status<500)await db.prepare('DELETE FROM refund_attempts WHERE payment_id=?').bind(row.payment_id).run();throw new RefundRequestError('Automatic renewal is stopped. The refund could not be confirmed; contact support to check Razorpay before retrying.',502)} throw error }
  if(typeof refund.id!=='string') throw new RefundRequestError('Razorpay returned an invalid refund response.',502)
  if(refund.status==='failed'){await db.prepare('DELETE FROM refund_attempts WHERE payment_id=?').bind(row.payment_id).run();throw new RefundRequestError('Razorpay declined the refund. Automatic renewal has been stopped.',502)}
  const providerStatus=refund.status==='processed'?'processed':refund.status==='failed'?'failed':'processing'
  await db.prepare(`INSERT INTO refunds(id,payment_id,subscription_id,provider_refund_id,amount_minor,currency,reason,provider_status,entitlement_effect,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'full_refund_requested',?,?)`)
    .bind(`razorpay_${refund.id}`,row.payment_id,input.subscriptionId,refund.id,amount,row.currency,`${input.source} cancellation refund`,providerStatus,now,now).run()
  await db.prepare(`UPDATE customer_subscriptions SET status=?,entitlement_status=?,renewal_enabled=0,updated_at=? WHERE id=?`).bind(providerStatus==='processed'&&amount===row.amount_minor?'refunded':'cancelled',providerStatus==='processed'&&amount===row.amount_minor?'refunded':'exhausted',now,input.subscriptionId).run()
  if(providerStatus==='processed'&&amount===row.amount_minor) await db.prepare(`UPDATE customer_payments SET status='refunded',updated_at=? WHERE id=?`).bind(now,row.payment_id).run()
  await db.prepare("UPDATE customer_refund_requests SET status='submitted',amount_minor=?,provider_refund_id=?,updated_at=? WHERE payment_id=? AND status='pending'").bind(amount,refund.id,now,row.payment_id).run()
  await recordAccountEvent(db,{userId:row.owner_id,subscriptionId:input.subscriptionId,eventType:providerStatus==='processed'?'refund_processed':'refund_requested',title:providerStatus==='processed'?'Refund processed':'Refund requested',detail:`Your ${row.currency} ${(amount/100).toFixed(2)} Razorpay refund is ${providerStatus}.`,now})
  return {status:providerStatus,refundId:refund.id,amountMinor:amount,currency:row.currency}
}
