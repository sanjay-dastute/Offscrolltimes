import { novemberLaunchTerm } from './dates'
import { stripeApi } from './stripe.server'

/** Move only verified paid launch subscriptions; never invoice or charge during alignment. */
export async function alignNovemberRenewal(db:D1Database,subscription:Record<string,any>,secret?:string) {
  const id=subscription.metadata?.local_subscription_id,owner=subscription.metadata?.owner_id
  if(!id||!owner)return subscription
  const row=await db.prepare(`SELECT s.duration_months,p.paid_at FROM customer_subscriptions s JOIN customer_payments p ON p.subscription_id=s.id AND p.owner_id=s.owner_id
    WHERE s.id=? AND s.owner_id=? AND s.payment_provider='stripe' AND s.status='active' AND s.entitlement_status='paid' AND p.status='paid'
    AND (SELECT COUNT(*) FROM customer_payments other WHERE other.subscription_id=s.id AND other.status='paid')=1`).bind(id,owner).first<{duration_months:number;paid_at:number}>()
  if(!row)return subscription
  const term=novemberLaunchTerm(row.paid_at,row.duration_months)
  if(!term||term.end<=Date.now()||subscription.cancel_at_period_end||!['active','trialing'].includes(subscription.status))return subscription
  const target=String(term.end/1000)
  let aligned=subscription
  if(subscription.metadata.edition_renewal_at!==target) {
    aligned=await stripeApi(`/subscriptions/${encodeURIComponent(subscription.id)}`,{trial_end:target,proration_behavior:'none','metadata[edition_renewal_at]':target},`november-renewal-${id}`,secret)
    if(aligned.id!==subscription.id||aligned.metadata?.owner_id!==owner||aligned.metadata?.local_subscription_id!==id||Number(aligned.trial_end)!==term.end/1000)throw new Error('Stripe launch renewal was not confirmed')
  }
  const end=Number(aligned.items?.data?.[0]?.current_period_end??aligned.current_period_end??aligned.trial_end)*1000
  if(end!==term.end)throw new Error('Stripe launch renewal date mismatch')
  await db.prepare(`UPDATE customer_subscriptions SET starts_at=?,ends_at=?,paid_through_at=?,renewal_at=?,next_dispatch_at=CASE WHEN copies_fulfilled=0 THEN ? ELSE next_dispatch_at END,updated_at=? WHERE id=? AND owner_id=? AND status='active' AND entitlement_status='paid'`)
    .bind(term.start,term.end,term.end,term.end,term.dispatch,Date.now(),id,owner).run()
  return aligned
}
