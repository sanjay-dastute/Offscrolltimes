import { audit } from './store.server'
import { stripeApi } from '#/lib/stripe.server'
import { syncStripePayments,cancelStripeSubscription } from '#/lib/stripe.endpoint.server'

export async function deleteRequestedCustomer(db:D1Database,actor:string,userId:string,requestId:string){
  const user=await db.prepare(`SELECT u.id,u.owner_id,u.role FROM users u JOIN customer_privacy_requests r ON r.owner_id=u.owner_id WHERE u.id=? AND u.role='customer' AND r.id=? AND r.request_type='deletion' AND r.status IN ('received','reviewing')`).bind(userId,requestId).first<{id:string;owner_id:string;role:string}>()
  if(!user)throw new Error('No open deletion request for this customer.')
  const now=Date.now()
  // Revoke access before contacting Stripe. If provider confirmation fails, retain data for a retry.
  await db.batch([
    db.prepare("UPDATE users SET account_state='restricted',updated_at=? WHERE id=?").bind(now,userId),
    db.prepare('DELETE FROM application_sessions WHERE user_id=?').bind(userId),
  ])
  await db.prepare('UPDATE stripe_checkouts SET last_checked_at=0 WHERE owner_id=?').bind(user.owner_id).run()
  await syncStripePayments(db,user.owner_id)
  const subscriptions=await db.prepare("SELECT id,stripe_subscription_id FROM customer_subscriptions WHERE owner_id=? AND payment_provider='stripe'").bind(user.owner_id).all<{id:string;stripe_subscription_id:string|null}>()
  for(const subscription of subscriptions.results){
    if(subscription.stripe_subscription_id){await cancelStripeSubscription(db,user.owner_id,subscription.id);continue}
    const row=await db.prepare('SELECT checkout_session_id FROM stripe_checkouts WHERE id=?').bind(subscription.id).first<{checkout_session_id:string|null}>()
    if(!row?.checkout_session_id)continue
    const checkout=await stripeApi(`/checkout/sessions/${encodeURIComponent(row.checkout_session_id)}`)
    if(checkout.client_reference_id!==subscription.id||checkout.metadata?.local_subscription_id!==subscription.id)throw new Error('Checkout ownership mismatch')
    if(checkout.subscription){const stripeId=typeof checkout.subscription==='string'?checkout.subscription:checkout.subscription.id;const provider=await stripeApi(`/subscriptions/${encodeURIComponent(stripeId)}`);if(provider.metadata?.owner_id!==user.owner_id||provider.metadata?.local_subscription_id!==subscription.id)throw new Error('Subscription ownership mismatch');await stripeApi(`/subscriptions/${encodeURIComponent(stripeId)}`,{cancel_at_period_end:'true'},`delete-${requestId}-${subscription.id}`)}
    else if(checkout.status==='open')await stripeApi(`/checkout/sessions/${encodeURIComponent(checkout.id)}/expire`,{},`expire-${requestId}-${subscription.id}`)
  }
  const emails=await db.prepare('SELECT email FROM customers WHERE user_id=? UNION SELECT primary_email email FROM users WHERE id=? UNION SELECT provider_email email FROM auth_identities WHERE user_id=?').bind(userId,userId,userId).all<{email:string|null}>()
  for(const {email} of emails.results){if(!email)continue;await db.prepare('DELETE FROM newsletter_subscribers WHERE email=?').bind(email).run();await db.prepare("UPDATE contact_enquiries SET name='Removed',email='removed@invalid.local',country=NULL,detail=NULL,message='Removed by account deletion',staff_notes='',updated_at=? WHERE email=?").bind(now,email).run()}
  await db.batch([
    db.prepare('DELETE FROM addresses WHERE customer_id IN (SELECT id FROM customers WHERE user_id=?)').bind(userId),
    db.prepare('DELETE FROM auth_identities WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM mfa_factors WHERE user_id=?').bind(userId),
    db.prepare('UPDATE oauth_transactions SET expires_at=0,consumed_at=? WHERE link_user_id=?').bind(now,userId),
    db.prepare('DELETE FROM oauth_transactions WHERE link_user_id=? AND expires_at=0').bind(userId),
    db.prepare('DELETE FROM stripe_checkouts WHERE owner_id=?').bind(user.owner_id),
    db.prepare('DELETE FROM account_events WHERE owner_id=?').bind(user.owner_id),
    db.prepare("UPDATE customers SET email=NULL,phone=NULL,display_name=NULL,whatsapp_number=NULL,marketing_consent=0,privacy_request_state='completed',updated_at=? WHERE user_id=?").bind(now,userId),
    db.prepare("DELETE FROM customers WHERE user_id=? AND id NOT IN (SELECT customer_id FROM orders)").bind(userId),
    db.prepare("UPDATE customer_subscriptions SET contact_email=NULL,contact_phone=NULL,delivery_address_json=NULL,status='cancelled',renewal_enabled=0,entitlement_status='exhausted',updated_at=? WHERE owner_id=?").bind(now,user.owner_id),
    db.prepare("UPDATE users SET account_state='deleted',primary_email=NULL,updated_at=? WHERE id=?").bind(now,userId),
    db.prepare("UPDATE customer_privacy_requests SET status='completed',updated_at=? WHERE owner_id=? AND request_type='deletion' AND status IN ('received','reviewing')").bind(now,user.owner_id),
  ])
  await audit(db,actor,'customer.account_deleted','user',userId,{requestId,accessRevoked:true,renewalsStopped:true,protectedHistoryRetained:true})
}
