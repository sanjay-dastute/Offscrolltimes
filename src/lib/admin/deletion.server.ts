import { audit } from './store.server'
import { cancelRazorpaySubscription } from '#/lib/razorpay.server'

export async function deleteRequestedCustomer(db:D1Database,actor:string,userId:string,requestId:string){
  const user=await db.prepare(`SELECT u.id,u.owner_id,u.role FROM users u JOIN customer_privacy_requests r ON r.owner_id=u.owner_id WHERE u.id=? AND u.role='customer' AND r.id=? AND r.request_type='deletion' AND r.status IN ('received','reviewing')`).bind(userId,requestId).first<{id:string;owner_id:string;role:string}>()
  if(!user)throw new Error('No open deletion request for this customer.')
  const now=Date.now()
  const mandates=await db.prepare("SELECT razorpay_subscription_id FROM razorpay_recurring_subscriptions WHERE owner_id=? AND status NOT IN ('cancelled','completed','expired')").bind(user.owner_id).all<{razorpay_subscription_id:string}>()
  for(const mandate of mandates.results)await cancelRazorpaySubscription(mandate.razorpay_subscription_id,true)
  // Revoke access before removing personal data while preserving commercial history.
  await db.batch([
    db.prepare("UPDATE users SET account_state='restricted',updated_at=? WHERE id=?").bind(now,userId),
    db.prepare('DELETE FROM application_sessions WHERE user_id=?').bind(userId),
  ])
  // Retain accounting relationships under an anonymous archive identity while
  // physically deleting the customer's original user row and sign-in identity.
  const archiveId=`removed_${crypto.randomUUID()}`,archiveOwner=`removed_${crypto.randomUUID()}`
  const tables=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all<{name:string}>()
  const replacements:D1PreparedStatement[]=[]
  for(const table of tables.results){
    if(table.name==='users'||!/^[A-Za-z0-9_]+$/.test(table.name))continue
    const columns=await db.prepare(`PRAGMA table_info(${table.name})`).all<{name:string}>()
    for(const column of columns.results){
      if(['owner_id','referrer_owner_id','referred_owner_id'].includes(column.name))replacements.push(db.prepare(`UPDATE ${table.name} SET ${column.name}=? WHERE ${column.name}=?`).bind(archiveOwner,user.owner_id))
    }
  }
  const emails=await db.prepare('SELECT email FROM customers WHERE user_id=? UNION SELECT primary_email email FROM users WHERE id=? UNION SELECT provider_email email FROM auth_identities WHERE user_id=?').bind(userId,userId,userId).all<{email:string|null}>()
  for(const {email} of emails.results){if(!email)continue;await db.prepare('DELETE FROM newsletter_subscribers WHERE email=?').bind(email).run();await db.prepare("UPDATE contact_enquiries SET name='Removed',email='removed@invalid.local',country=NULL,detail=NULL,message='Removed by account deletion',staff_notes='',updated_at=? WHERE email=?").bind(now,email).run()}
  await db.batch([
    db.prepare('DELETE FROM addresses WHERE customer_id IN (SELECT id FROM customers WHERE user_id=?)').bind(userId),
    db.prepare('DELETE FROM auth_identities WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM mfa_factors WHERE user_id=?').bind(userId),
    db.prepare('UPDATE oauth_transactions SET expires_at=0,consumed_at=? WHERE link_user_id=?').bind(now,userId),
    db.prepare('DELETE FROM oauth_transactions WHERE link_user_id=? AND expires_at=0').bind(userId),
    db.prepare('DELETE FROM account_events WHERE owner_id=?').bind(user.owner_id),
    db.prepare("UPDATE customers SET email=NULL,phone=NULL,display_name=NULL,whatsapp_number=NULL,marketing_consent=0,privacy_request_state='completed',updated_at=? WHERE user_id=?").bind(now,userId),
    db.prepare("DELETE FROM customers WHERE user_id=? AND id NOT IN (SELECT customer_id FROM orders)").bind(userId),
    db.prepare("UPDATE customer_subscriptions SET contact_email=NULL,contact_phone=NULL,delivery_address_json=NULL,status='cancelled',renewal_enabled=0,entitlement_status='exhausted',updated_at=? WHERE owner_id=?").bind(now,user.owner_id),
    db.prepare("UPDATE users SET account_state='deleted',primary_email=NULL,updated_at=? WHERE id=?").bind(now,userId),
    db.prepare("UPDATE customer_privacy_requests SET status='completed',updated_at=? WHERE owner_id=? AND request_type='deletion' AND status IN ('received','reviewing')").bind(now,user.owner_id),
  ])
  await db.batch([
    db.prepare("INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES(?,?,'customer','deleted',?,?)").bind(archiveId,archiveOwner,now,now),
    db.prepare('UPDATE customers SET user_id=? WHERE user_id=?').bind(archiveId,userId),
    db.prepare('DELETE FROM identity_security_events WHERE actor_user_id=?').bind(userId),
    db.prepare('DELETE FROM customer_referral_codes WHERE owner_id=?').bind(user.owner_id),
    ...replacements,
    db.prepare('DELETE FROM users WHERE id=?').bind(userId),
  ])
  await audit(db,actor,'customer.account_deleted','user',userId,{requestId,accessRevoked:true,renewalsStopped:true,protectedHistoryRetained:true})
}
