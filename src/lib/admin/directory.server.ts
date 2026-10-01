import { audit } from './store.server'

export async function customerDirectory(db: D1Database, url: URL) {
  const query = (url.searchParams.get('query') ?? '').trim().slice(0, 100)
  const page = Math.max(1, Math.min(100000, Math.floor(Number(url.searchParams.get('page')) || 1)))
  const status = url.searchParams.get('status') ?? 'all'
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`
  const where = `WHERE (COALESCE(c.display_name,'') LIKE ? ESCAPE '\\' OR COALESCE(c.email,u.primary_email,'') LIKE ? ESCAPE '\\' OR COALESCE(c.whatsapp_number,'') LIKE ? ESCAPE '\\' OR COALESCE(c.phone,'') LIKE ? ESCAPE '\\')
    AND (?='all' OR (?='subscribers' AND EXISTS(SELECT 1 FROM customer_subscriptions s WHERE s.owner_id=u.owner_id)) OR (?='registered' AND NOT EXISTS(SELECT 1 FROM customer_subscriptions s WHERE s.owner_id=u.owner_id)))`
  const args = [pattern, pattern, pattern, pattern, status, status, status]
  const count = await db.prepare(`SELECT COUNT(*) total FROM users u LEFT JOIN customers c ON c.user_id=u.id ${where}`).bind(...args).first<{total:number}>()
  const total = Number(count?.total ?? 0), pages = Math.max(1, Math.ceil(total / 25)), current = Math.min(page, pages)
  const rows = await db.prepare(`SELECT u.id user_id,u.owner_id,u.account_state,u.created_at,c.id customer_id,c.display_name,COALESCE(c.email,u.primary_email) email,c.phone,c.whatsapp_number,
    (SELECT json_object('name',a.name,'line1',a.line1,'line2',a.line2,'city',a.city,'region',a.region,'postalCode',a.postal_code,'country',a.country) FROM addresses a WHERE a.customer_id=c.id AND a.active_to IS NULL ORDER BY a.version DESC LIMIT 1) address_json,
    (SELECT COUNT(*) FROM customer_subscriptions s WHERE s.owner_id=u.owner_id) subscription_count,
    (SELECT s.status FROM customer_subscriptions s WHERE s.owner_id=u.owner_id ORDER BY s.created_at DESC,s.id DESC LIMIT 1) subscription_status,
    (SELECT p.status FROM customer_payments p WHERE p.owner_id=u.owner_id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) payment_status
    FROM users u LEFT JOIN customers c ON c.user_id=u.id ${where} ORDER BY u.created_at DESC,u.id LIMIT 25 OFFSET ?`).bind(...args,(current-1)*25).all<Record<string,unknown>>()
  return { customers: rows.results.map(({address_json,...row}):Record<string,unknown>=>({...row,address:address_json?JSON.parse(String(address_json)):null})), page:current,pages,total }
}

export async function updateCustomerContact(db:D1Database,actor:string,input:{userId:string;name:string;email:string;phone:string;whatsapp:string;reason:string}) {
  const user=await db.prepare('SELECT id FROM users WHERE id=?').bind(input.userId).first()
  if(!user)return false
  const now=Date.now()
  await db.prepare(`INSERT INTO customers(id,user_id,email,phone,display_name,whatsapp_number,transactional_contact_basis,marketing_consent,privacy_request_state,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'contract',0,'none',?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,phone=excluded.phone,display_name=excluded.display_name,whatsapp_number=excluded.whatsapp_number,updated_at=excluded.updated_at`)
    .bind(`customer_${input.userId}`,input.userId,input.email,input.phone||null,input.name,input.whatsapp||null,now,now).run()
  await audit(db,actor,'customer.contact_updated','user',input.userId,{reason:input.reason,fields:['name','email','phone','whatsapp']})
  return true
}
