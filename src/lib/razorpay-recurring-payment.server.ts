import { applyCustomerPaymentSucceeded,recordCustomerSubscriptionRenewal } from './customer/store.server'

/** Called only after callback signature or webhook/provider verification. */
export async function recordVerifiedRecurringPayment(db:D1Database,providerId:string,payment:{id?:unknown;status?:unknown;amount?:unknown;currency?:unknown;created_at?:unknown}){
  if(payment.status!=='captured'||typeof payment.id!=='string')return false
  const row=await db.prepare(`SELECT ro.subscription_id,ro.owner_id,ro.amount_minor,ro.currency,s.entitlement_status,s.status,rs.next_charge_at FROM razorpay_orders ro JOIN customer_subscriptions s ON s.id=ro.subscription_id LEFT JOIN razorpay_recurring_subscriptions rs ON rs.subscription_id=ro.subscription_id WHERE ro.razorpay_order_id=?`).bind(providerId).first<{subscription_id:string;owner_id:string;amount_minor:number;currency:string;entitlement_status:string;status:string;next_charge_at:number|null}>()
  if(!row||Number(payment.amount)!==row.amount_minor||payment.currency!==row.currency)return false
  if(await db.prepare('SELECT id FROM customer_payments WHERE provider_payment_id=? AND paid_at IS NOT NULL').bind(payment.id).first())return true
  const paidAt=Number(payment.created_at)*1000
  if(!Number.isFinite(paidAt)||paidAt<=0)return false
  if(['cancelled','refunded','completed'].includes(row.status))return false
  if(row.entitlement_status==='paid')return recordCustomerSubscriptionRenewal(db,{id:row.subscription_id,paymentId:payment.id,paidAt,amountMinor:row.amount_minor,currency:row.currency,now:Date.now()})
  const applied=await applyCustomerPaymentSucceeded(db,{id:row.subscription_id,payerUserId:row.owner_id,paymentId:payment.id,paidAt,now:Date.now()})
  if(applied)await db.prepare("UPDATE razorpay_orders SET razorpay_payment_id=?,status='captured',updated_at=? WHERE subscription_id=?").bind(payment.id,Date.now(),row.subscription_id).run()
  return applied
}
