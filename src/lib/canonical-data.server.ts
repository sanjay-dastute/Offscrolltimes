import type { CustomerAddress } from '#/lib/customer/store.server'

export async function recordUserRole(db:D1Database,ownerId:string,role:'customer'|'admin'){
  const now=Date.now();await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES(?,?,?,'active',?,?) ON CONFLICT(owner_id) DO UPDATE SET role=excluded.role,updated_at=excluded.updated_at`).bind(`user_${ownerId}`,ownerId,role,now,now).run()
}

export async function recordCustomerOrder(db:D1Database,input:{userId:string;email:string;phone?:string;subscriptionId:string;providerOrderId:string;currency:string;amountMinor:number;pricingSnapshot:unknown;address:CustomerAddress;termsAcceptedAt:number}){
  const now=Date.now(),userId=`user_${input.userId}`,customerId=`customer_${input.userId}`
  await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES(?,?,'customer','active',?,?) ON CONFLICT(owner_id) DO UPDATE SET updated_at=excluded.updated_at`).bind(userId,input.userId,now,now).run()
  await db.prepare(`INSERT INTO customers(id,user_id,email,phone,transactional_contact_basis,marketing_consent,privacy_request_state,created_at,updated_at) VALUES(?,?,?,?,'contract',0,'none',?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,phone=COALESCE(excluded.phone,customers.phone),updated_at=excluded.updated_at`).bind(customerId,userId,input.email,input.phone||null,now,now).run()
  const version=(await db.prepare(`SELECT COALESCE(MAX(version),0)+1 next_version FROM addresses WHERE customer_id=? AND address_type='delivery'`).bind(customerId).first<{next_version:number}>())?.next_version??1
  await db.prepare(`UPDATE addresses SET active_to=? WHERE customer_id=? AND address_type='delivery' AND active_to IS NULL`).bind(now,customerId).run()
  await db.prepare(`INSERT INTO addresses(id,customer_id,address_type,version,name,line1,line2,city,region,postal_code,country,active_from,created_at) VALUES(?,?,'delivery',?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),customerId,version,input.address.name,input.address.line1,input.address.line2||null,input.address.city,input.address.region||null,input.address.postalCode,input.address.country,now,now).run()
  await db.prepare(`INSERT INTO orders(id,customer_id,subscription_id,provider_order_id,currency,amount_minor,pricing_snapshot_json,delivery_address_snapshot_json,terms_accepted_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),customerId,input.subscriptionId,input.providerOrderId,input.currency,input.amountMinor,JSON.stringify(input.pricingSnapshot),JSON.stringify(input.address),input.termsAcceptedAt,now).run()
}

export async function recordAddressVersion(db:D1Database,input:{ownerId:string;address:CustomerAddress;reason:string;now:number}){
  const customer=await db.prepare(`SELECT c.id FROM customers c JOIN users u ON u.id=c.user_id WHERE u.owner_id=?`).bind(input.ownerId).first<{id:string}>();if(!customer)return
  const version=(await db.prepare(`SELECT COALESCE(MAX(version),0)+1 next_version FROM addresses WHERE customer_id=? AND address_type='delivery'`).bind(customer.id).first<{next_version:number}>())?.next_version??1
  await db.prepare(`UPDATE addresses SET active_to=? WHERE customer_id=? AND address_type='delivery' AND active_to IS NULL`).bind(input.now,customer.id).run()
  await db.prepare(`INSERT INTO addresses(id,customer_id,address_type,version,name,line1,line2,city,region,postal_code,country,active_from,change_reason,created_at) VALUES(?,?,'delivery',?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),customer.id,version,input.address.name,input.address.line1,input.address.line2||null,input.address.city,input.address.region||null,input.address.postalCode,input.address.country,input.now,input.reason,input.now).run()
}
