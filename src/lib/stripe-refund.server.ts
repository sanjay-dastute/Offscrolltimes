import {stripeApi} from './stripe.server'
const providerId=(value:any)=>typeof value==='string'?value:value?.id
export const REFUND_WINDOW_MS=48*60*60*1000
export class RefundWindowError extends Error{}

export async function recordStripeCancellationRefund(db:D1Database,refund:Record<string,any>){
  const intent=await db.prepare('SELECT r.*,p.amount_minor,p.currency FROM stripe_cancellation_refunds r JOIN customer_payments p ON p.id=r.payment_id WHERE r.stripe_refund_id=? OR r.payment_id=?').bind(refund.id,refund.metadata?.local_payment_id??'').first<Record<string,any>>()
  if(!intent)return
  if(refund.metadata?.owner_id!==intent.owner_id||refund.metadata?.local_subscription_id!==intent.subscription_id||refund.amount!==intent.amount_minor||String(refund.currency).toUpperCase()!==intent.currency)throw new Error('Refund ownership or amount mismatch')
  const status=refund.status==='succeeded'?'processed':['failed','canceled'].includes(refund.status)?'failed':'processing',now=Date.now()
  await db.batch([
    db.prepare('UPDATE stripe_cancellation_refunds SET stripe_refund_id=?,status=?,updated_at=? WHERE payment_id=?').bind(refund.id,status,now,intent.payment_id),
    db.prepare(`INSERT INTO refunds(id,payment_id,subscription_id,provider_refund_id,amount_minor,currency,reason,provider_status,entitlement_effect,created_at,updated_at) VALUES(?,?,?,?,?,?,'Customer cancellation within 48 hours',?,'Remove refunded term entitlement',?,?) ON CONFLICT(id) DO UPDATE SET provider_status=excluded.provider_status,updated_at=excluded.updated_at`).bind(`stripe_refund_${refund.id}`,intent.payment_id,intent.subscription_id,refund.id,refund.amount,intent.currency,status,now,now),
    db.prepare("UPDATE customer_payments SET status=CASE WHEN ?='processed' THEN 'refunded' ELSE status END,updated_at=? WHERE id=?").bind(status,now,intent.payment_id),
    db.prepare(`UPDATE customer_subscriptions SET copies_total=CASE WHEN ?='processed' AND copies_total-duration_months*quantity>copies_fulfilled THEN copies_total-duration_months*quantity ELSE copies_total END,
      status=CASE WHEN ?='processed' AND copies_total-duration_months*quantity<=copies_fulfilled THEN 'refunded' ELSE 'cancelled' END,
      entitlement_status=CASE WHEN ?='processed' AND copies_total-duration_months*quantity<=copies_fulfilled THEN 'refunded' ELSE entitlement_status END,
      renewal_enabled=0,cancellation_requested_at=COALESCE(cancellation_requested_at,?),updated_at=?
      WHERE id=? AND NOT EXISTS(SELECT 1 FROM account_events WHERE id=?)`).bind(status,status,status,intent.requested_at,now,intent.subscription_id,`refund_processed_${refund.id}`),
    ...(status==='processed'?[db.prepare(`INSERT INTO account_events(id,owner_id,subscription_id,event_type,title,detail,created_at) VALUES(?,?,?,'stripe_refund_processed','Subscription cancelled and refund issued',?,?) ON CONFLICT(id) DO NOTHING`).bind(`refund_processed_${refund.id}`,intent.owner_id,intent.subscription_id,`Stripe refunded ${intent.currency} ${(refund.amount/100).toFixed(2)} to the original payment method.`,now)]:[]),
  ])
}

export async function cancelAndRefundStripe(db:D1Database,ownerId:string,id:string,now=Date.now(),resumeAccepted=false,secret=process.env.STRIPE_SECRET_KEY){
  const api=(path:string,params?:Record<string,string>,key?:string,method?:'DELETE')=>stripeApi(path,params,key,secret,method)
  const row=await db.prepare("SELECT * FROM customer_subscriptions WHERE id=? AND owner_id=? AND payment_provider='stripe'").bind(id,ownerId).first<Record<string,any>>()
  if(!row?.stripe_subscription_id)throw new RefundWindowError('A verified Stripe payment is required.')
  const payment=await db.prepare("SELECT * FROM customer_payments WHERE subscription_id=? AND owner_id=? AND status IN ('paid','refunded') ORDER BY paid_at DESC,created_at DESC LIMIT 1").bind(id,ownerId).first<Record<string,any>>()
  if(!payment?.paid_at)throw new RefundWindowError('A verified payment is required.')
  const existing=await db.prepare('SELECT * FROM stripe_cancellation_refunds WHERE payment_id=?').bind(payment.id).first<Record<string,any>>()
  const accepted=resumeAccepted&&existing&&existing.requested_at>=payment.paid_at&&existing.requested_at<payment.paid_at+REFUND_WINDOW_MS
  if(!accepted&&(now<payment.paid_at||now>=payment.paid_at+REFUND_WINDOW_MS))throw new RefundWindowError('The 48-hour cancellation and refund window has closed. Contact support.')
  if(existing?.stripe_refund_id){const refund=await api(`/refunds/${encodeURIComponent(existing.stripe_refund_id)}`);await recordStripeCancellationRefund(db,refund);if(['failed','canceled'].includes(refund.status))throw new Error('Stripe refund failed');await api(`/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`,{invoice_now:'false',prorate:'false'},`refund-end-${payment.id}`,'DELETE');return refund.status}
  if(payment.status!=='paid')throw new RefundWindowError('This payment has already been refunded.')
  const invoice=await api(`/invoices/${encodeURIComponent(payment.provider_payment_id)}?expand[]=payments.data.payment.payment_intent`)
  const subscription=await api(`/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`)
  if(subscription.metadata?.owner_id!==ownerId||subscription.metadata?.local_subscription_id!==id||providerId(invoice.parent?.subscription_details?.subscription??invoice.subscription)!==subscription.id||providerId(invoice.customer)!==providerId(subscription.customer)||invoice.status!=='paid'||invoice.amount_paid!==payment.amount_minor||invoice.amount_remaining!==0||String(invoice.currency).toUpperCase()!==payment.currency)throw new Error('Invoice does not match the customer payment')
  const payments=invoice.payments?.data??[]
  const paid=payments.filter((entry:any)=>entry.status==='paid'&&entry.payment?.type==='payment_intent')
  const paymentIntentId=providerId(invoice.payment_intent??(paid.length===1?paid[0].payment.payment_intent:null))
  if(!paymentIntentId)throw new Error('No single refundable Stripe payment was found')
  const intent=await api(`/payment_intents/${encodeURIComponent(paymentIntentId)}`)
  if(providerId(intent.customer)!==providerId(subscription.customer)||intent.status!=='succeeded'||intent.amount_received!==payment.amount_minor||String(intent.currency).toUpperCase()!==payment.currency)throw new Error('Payment intent does not match this customer')
  await db.prepare('INSERT INTO stripe_cancellation_refunds(payment_id,subscription_id,owner_id,requested_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(payment_id) DO NOTHING').bind(payment.id,id,ownerId,now,now).run()
  // Stop future renewal before refunding; failures stay visible and can be retried with the same idempotency keys.
  await api(`/subscriptions/${encodeURIComponent(subscription.id)}`,{cancel_at_period_end:'true'},`refund-cancel-${payment.id}`)
  await db.prepare("UPDATE customer_subscriptions SET renewal_enabled=0,status='cancelled',cancellation_requested_at=?,updated_at=? WHERE id=? AND owner_id=?").bind(now,now,id,ownerId).run()
  const refund=await api('/refunds',{payment_intent:paymentIntentId,amount:String(payment.amount_minor),reason:'requested_by_customer','metadata[local_payment_id]':payment.id,'metadata[local_subscription_id]':id,'metadata[owner_id]':ownerId},`refund-48h-${payment.id}`)
  await recordStripeCancellationRefund(db,refund)
  if(['failed','canceled'].includes(refund.status))throw new Error('Stripe could not complete the refund')
  await api(`/subscriptions/${encodeURIComponent(subscription.id)}`,{invoice_now:'false',prorate:'false'},`refund-end-${payment.id}`,'DELETE')
  return refund.status
}

export async function syncStripeRefunds(db:D1Database,secret=process.env.STRIPE_SECRET_KEY,ownerId?:string){
  if(!secret)return
  const requested=await db.prepare("SELECT owner_id,subscription_id FROM stripe_cancellation_refunds WHERE stripe_refund_id IS NULL AND status='requested' AND (? IS NULL OR owner_id=?) ORDER BY updated_at LIMIT 5").bind(ownerId??null,ownerId??null).all<{owner_id:string;subscription_id:string}>()
  for(const row of requested.results){try{await cancelAndRefundStripe(db,row.owner_id,row.subscription_id,Date.now(),true,secret)}catch{console.error('stripe_refund_request_retry_failed')}}
  const rows=await db.prepare("SELECT stripe_refund_id FROM stripe_cancellation_refunds WHERE stripe_refund_id IS NOT NULL AND status='processing' AND (? IS NULL OR owner_id=?) ORDER BY updated_at LIMIT 10").bind(ownerId??null,ownerId??null).all<{stripe_refund_id:string}>()
  for(const row of rows.results){try{await recordStripeCancellationRefund(db,await stripeApi(`/refunds/${encodeURIComponent(row.stripe_refund_id)}`,undefined,undefined,secret))}catch{console.error('stripe_refund_sync_failed')}}
}
