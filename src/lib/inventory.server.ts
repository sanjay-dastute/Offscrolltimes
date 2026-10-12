/** Reserve a paid customer's copy in every created edition within their term. */
export async function reserveSubscriptionInventory(db:D1Database,subscriptionId:string,now:number,from:number){
  await db.prepare(`INSERT OR IGNORE INTO edition_inventory_entries(id,edition_id,kind,subscription_id,quantity,note,created_by,created_at)
    SELECT 'subscription_'||e.id||'_'||s.id,e.id,'subscription',s.id,s.quantity,'Paid subscription reservation','system',?
    FROM editions e JOIN customer_subscriptions s ON s.id=?
    WHERE e.deleted_at IS NULL AND e.status IN ('draft','eligibility_generated') AND s.entitlement_status='paid' AND s.status='active'
    AND s.starts_at<=e.dispatch_at AND e.dispatch_at>=? AND COALESCE(s.paid_through_at,s.ends_at,0)>e.dispatch_at
    AND e.copies_available>=s.quantity
    AND EXISTS(SELECT 1 FROM customer_payments p WHERE p.subscription_id=s.id AND p.status='paid')
    AND NOT EXISTS(SELECT 1 FROM edition_inventory_entries i WHERE i.edition_id=e.id AND i.subscription_id=s.id)`).bind(now,subscriptionId,from).run()
}
