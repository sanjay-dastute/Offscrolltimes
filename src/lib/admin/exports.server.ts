import { ADMIN_EXPORTS } from '#/content/admin-exports'
import { readAdministratorSession } from './auth.server'
import { lifecycleBindings } from '../lifecycle/env.server'
import { isSameOrigin } from '../security'
import { json } from '../http.server'
import { audit } from './store.server'

const queries:Record<string,string>={
  customers:`SELECT u.id user_id,u.owner_id,u.account_state,c.id customer_id,c.display_name,c.email,c.phone,c.whatsapp_number,c.marketing_consent,c.created_at,c.updated_at,a.name delivery_name,a.line1 address_line_1,a.line2 address_line_2,a.city,a.region,a.postal_code,a.country FROM users u LEFT JOIN customers c ON c.user_id=u.id LEFT JOIN addresses a ON a.id=(SELECT id FROM addresses WHERE customer_id=c.id AND active_to IS NULL ORDER BY version DESC LIMIT 1) WHERE u.role='customer' ORDER BY u.created_at,u.id`,
  addresses:'SELECT * FROM addresses ORDER BY created_at,id',
  orders:'SELECT * FROM orders ORDER BY created_at,id',
  subscriptions:'SELECT * FROM customer_subscriptions ORDER BY created_at,id',
  payments:'SELECT * FROM customer_payments ORDER BY created_at,id',
  refunds:'SELECT * FROM refunds ORDER BY created_at,id',
  shipments:'SELECT * FROM shipments ORDER BY created_at,id',
  fulfilments:'SELECT * FROM customer_fulfilments ORDER BY created_at,id',
  editions:'SELECT * FROM editions ORDER BY dispatch_at,id',
  eligibility:'SELECT * FROM edition_eligibility_snapshots ORDER BY created_at,id',
  newsletter:'SELECT id,email,status,consent_at,consent_text,created_at,updated_at FROM newsletter_subscribers ORDER BY created_at,id',
  enquiries:'SELECT * FROM contact_enquiries ORDER BY created_at,id',
  discounts:'SELECT * FROM admin_discounts ORDER BY created_at,id',
  redemptions:'SELECT * FROM discount_redemptions ORDER BY created_at,id',
  products:'SELECT * FROM admin_products ORDER BY id',
  plans:'SELECT * FROM admin_subscription_options ORDER BY id',
  'shipping-zones':'SELECT * FROM admin_shipping_zones ORDER BY country_code',
  content:'SELECT * FROM admin_content ORDER BY content_key',
  'account-events':'SELECT * FROM account_events ORDER BY created_at,id',
  'privacy-requests':'SELECT * FROM customer_privacy_requests ORDER BY created_at,id',
  'email-delivery':'SELECT * FROM transactional_email_log ORDER BY created_at,id',
  files:'SELECT id,category,owner_id,related_type,related_id,original_name,content_type,size_bytes,visibility,created_by,created_at,deleted_at FROM object_storage_records ORDER BY created_at,id',
  analytics:'SELECT * FROM first_party_analytics_events ORDER BY created_at,id',
  audit:'SELECT * FROM admin_audit_log ORDER BY created_at,id',
}

export function exportCsvCell(value:unknown){
  let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value)
  // Spreadsheet programs must treat user-entered formulas as plain text.
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(text))text=`'${text}`
  return `"${text.replace(/"/g,'""')}"`
}

export async function downloadAdminExport(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readAdministratorSession(request)
  if(!session)return json({error:'Administrator access required.'},403)
  const body=await request.json().catch(()=>null) as {dataset?:unknown;format?:unknown;csrf?:unknown}|null
  if(body?.csrf!==session.csrf)return json({error:'Refresh your admin session and retry.'},403)
  const dataset=typeof body.dataset==='string'?body.dataset:''
  const format=body.format
  if(!Object.hasOwn(queries,dataset)||!ADMIN_EXPORTS.some(item=>item[0]===dataset)||(format!=='csv'&&format!=='json'))return json({error:'Choose a valid export and format.'},422)
  try{
    const db=lifecycleBindings().db
    // Read directly from D1, never from the paginated dashboard lists.
    // D1 column names also provide headers for empty datasets.
    const raw=await db.prepare(queries[dataset]).raw({columnNames:true})
    const columns=raw[0] as string[]
    const rows=raw.slice(1).map(values=>Object.fromEntries(columns.map((column,index)=>[column,values[index]])))
    const content=format==='json'?JSON.stringify(rows,null,2):'\uFEFF'+[columns.map(exportCsvCell).join(','),...rows.map(row=>columns.map(column=>exportCsvCell(row[column])).join(','))].join('\r\n')
    await audit(db,session.user.id,'data.exported','dataset',dataset,{format,rowCount:rows.length})
    const filename=`offscroll-${dataset}-${new Date().toISOString().slice(0,10)}.${format}`
    return new Response(content,{headers:{'Content-Type':format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
  }catch{return json({error:'Export could not be completed. Please retry.'},503)}
}
