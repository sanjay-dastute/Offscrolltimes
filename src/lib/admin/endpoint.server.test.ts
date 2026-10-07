import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessionCookie, type SessionData } from '#/lib/auth.server'
import { applyCustomerPaymentSucceeded, registerCustomerCheckout, saveCustomerCheckoutDetails } from '#/lib/customer/store.server'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from '#/lib/lifecycle/env.server'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { getAdmin, getDispatchCsv, mutateAdmin } from './endpoint.server'

const origin = 'https://example.com'
let db: D1Database

async function request(userId: string, path: string, init: RequestInit = {}, extraCookie = '') {
  const session: SessionData = { accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 60_000, user: { id: userId }, csrf: `csrf-${userId}` }
  return new Request(`${origin}${path}`, { ...init, headers: { Origin: origin, Cookie: `${await sessionCookie(session)}${extraCookie?`; ${extraCookie}`:''}`, ...(init.headers ?? {}) } })
}

beforeEach(() => {
  process.env.SESSION_SECRET = 'admin-tests-session-secret-at-least-32-characters'
  process.env.ADMIN_IDENTITY_IDS = 'admin_1,admin_2'
  db = createTestD1()
  initRequestLifecycleBindings({ LIFECYCLE_DB: db, LIFECYCLE_SECRET: 'admin-lifecycle-secret-at-least-32-characters' })
})

afterEach(() => { Reflect.deleteProperty(process.env,'ADMIN_IDENTITY_IDS'); Reflect.deleteProperty(process.env,'FULFIL_PAID_AFTER_CANCELLATION'); resetRequestLifecycleBindings() })

async function mutation(userId: string, body: Record<string, unknown>) {
  return mutateAdmin(await request(userId, '/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf: `csrf-${userId}`, ...body }) }))
}

describe('administrator authorization and fulfilment', () => {
  it('permits only administrators to unsubscribe an email signup and records an audit',async()=>{
    await db.prepare(`INSERT INTO newsletter_subscribers(id,email,status,consent_at,consent_text,unsubscribe_token_hash,created_at,updated_at) VALUES('signup_test','reader@example.com','subscribed',1,'Explicit consent','hash',1,1)`).run()
    expect((await mutation('customer_1',{action:'newsletter.unsubscribe',subscriberId:'signup_test'})).status).toBe(403)
    expect((await mutation('admin_1',{action:'newsletter.unsubscribe',subscriberId:'signup_test',csrf:'wrong'})).status).toBe(403)
    expect((await mutation('admin_1',{action:'newsletter.unsubscribe',subscriberId:'signup_test'})).status).toBe(200)
    expect(await db.prepare('SELECT status FROM newsletter_subscribers').first()).toMatchObject({status:'unsubscribed'})
    expect(await db.prepare(`SELECT action FROM admin_audit_log WHERE target_id='signup_test'`).first()).toMatchObject({action:'newsletter.unsubscribed'})
  })
  it('requires administrator authorization and CSRF for customer corrections and offer activation',async()=>{
    expect((await mutation('customer_1',{action:'customer.contact'})).status).toBe(403)
    expect((await mutation('admin_1',{action:'customer.contact',csrf:'wrong'})).status).toBe(403)
    expect((await mutation('admin_1',{action:'customer.contact',userId:'user_1',name:'Reader',email:'reader@example.com',whatsapp:'123',reason:'Contact correction'})).status).toBe(422)
    expect((await mutation('admin_1',{action:'discount.toggle',discountId:'launch-159',active:false})).status).toBe(200)
    expect(await db.prepare(`SELECT active FROM admin_discounts WHERE id='launch-159'`).first()).toMatchObject({active:0})
    expect((await mutation('admin_1',{action:'catalog.upsert',kind:'discount',id:'invalid',code:'INVALID',discountKind:'percentage',value:10001})).status).toBe(422)
    for(const fields of [{eligibleDurations:'3,invalid'},{eligibleCountries:'IN,INVALID'},{usageLimit:0}])expect((await mutation('admin_1',{action:'catalog.upsert',kind:'discount',id:'invalid',code:'INVALID',discountKind:'percentage',value:1000,...fields})).status).toBe(422)
  })

  it('saves an administrator delivery-address correction and returns it in the refreshed dashboard',async()=>{
    const now=Date.now()
    await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('customer_internal','customer_address','customer','active',?,?)`).bind(now,now).run()
    await registerCustomerCheckout(db,{id:'address_subscription',userId:'customer_address',planId:'monthly',planName:'Monthly',durationMonths:1,quantity:1,currency:'INR',amountMinor:19900,now})
    await applyCustomerPaymentSucceeded(db,{id:'address_subscription',payerUserId:'customer_address',paymentId:'pay_address_test',paidAt:now,now})
    const address={name:'Updated Reader',line1:'42 New Road',line2:'Flat 3',city:'Coimbatore',region:'Tamil Nadu',postalCode:'641001',country:'IN'}
    expect((await mutation('admin_1',{action:'subscription.address',subscriptionId:'address_subscription',email:'updated@example.com',phone:'+917373050093',reason:'Customer moved address',address})).status).toBe(200)
    expect(await db.prepare(`SELECT contact_email,contact_phone,delivery_address_json FROM customer_subscriptions WHERE id='address_subscription'`).first()).toMatchObject({contact_email:'updated@example.com',contact_phone:'+917373050093',delivery_address_json:JSON.stringify(address)})
    expect(await db.prepare(`SELECT display_name,email,phone FROM customers WHERE user_id='customer_internal'`).first()).toMatchObject({display_name:'Updated Reader',email:'updated@example.com',phone:'+917373050093'})
    const dashboard=await getAdmin(await request('admin_1','/api/admin'))
    expect((await dashboard.json() as {subscriptions:Array<{id:string;delivery_address:typeof address}>}).subscriptions.find(row=>row.id==='address_subscription')?.delivery_address).toMatchObject(address)
  })

  it('lets an administrator add and update delivery prices by country',async()=>{
    expect((await mutation('admin_1',{action:'catalog.upsert',kind:'shipping',countryCode:'GB',countryName:'United Kingdom',currency:'GBP',shippingMinor:1250,additionalCopyMinor:300,taxRateBasisPoints:0})).status).toBe(200)
    expect(await db.prepare(`SELECT shipping_minor,additional_copy_minor FROM admin_shipping_zones WHERE country_code='GB'`).first()).toMatchObject({shipping_minor:1250,additional_copy_minor:300})
    expect((await mutation('admin_1',{action:'catalog.upsert',kind:'shipping',countryCode:'GB',countryName:'United Kingdom',currency:'GBP',shippingMinor:1900,additionalCopyMinor:500,taxRateBasisPoints:0})).status).toBe(200)
    expect(await db.prepare(`SELECT shipping_minor,additional_copy_minor FROM admin_shipping_zones WHERE country_code='GB'`).first()).toMatchObject({shipping_minor:1900,additional_copy_minor:500})
    expect((await mutation('admin_1',{action:'catalog.upsert',kind:'shipping',countryCode:'INVALID',countryName:'Invalid',currency:'GBP',shippingMinor:0,additionalCopyMinor:0,taxRateBasisPoints:0})).status).toBe(422)
  })
  it('rejects a signed-in customer who is not configured as an administrator', async () => {
    expect((await getAdmin(await request('customer_1', '/api/admin'))).status).toBe(403)
    expect((await mutation('customer_1', { action: 'edition.create' })).status).toBe(403)
  })

  it('allows only explicitly configured administrators and never returns security credentials', async () => {
    const response = await getAdmin(await request('admin_1', '/api/admin'))
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).not.toContain('accessToken')
    expect(text).not.toContain('refreshToken')
    expect(text).not.toContain(process.env.SESSION_SECRET!)
  })

  it('edits and deletes an unused edition, but only before a delivery list exists', async () => {
    expect((await mutation('admin_1',{action:'edition.create',label:'Launch edition',issueNumber:7,copiesAvailable:100,dispatch:'2026-12-20'})).status).toBe(200)
    expect((await mutation('admin_1',{action:'edition.update',editionId:'edition_7',label:'December launch',issueNumber:7,copiesAvailable:0,dispatch:'2026-12-22'})).status).toBe(200)
    expect(await db.prepare(`SELECT label,copies_available FROM editions WHERE id='edition_7'`).first()).toMatchObject({label:'December launch',copies_available:0})
    expect((await mutation('admin_1',{action:'edition.delete',editionId:'edition_7',confirm:true})).status).toBe(200)
    expect(await db.prepare(`SELECT deleted_at FROM editions WHERE id='edition_7'`).first<{deleted_at:number}>()).toMatchObject({deleted_at:expect.any(Number)})
  })

  it('allows a locked edition with no prepared copies to be edited or removed from the working list', async () => {
    const now = Date.now()
    expect((await mutation('admin_1',{action:'edition.create',label:'Locked edition',issueNumber:8,copiesAvailable:100,cutoff:new Date(now + 1_000).toISOString(),dispatch:new Date(now + 86_400_000).toISOString()})).status).toBe(200)
    expect((await mutation('admin_1',{action:'edition.generate',editionId:'edition_8'})).status).toBe(200)
    expect((await mutation('admin_1',{action:'edition.lock',editionId:'edition_8',reason:'No copies have been prepared'})).status).toBe(200)
    expect((await mutation('admin_1',{action:'edition.update',editionId:'edition_8',label:'Corrected locked edition',issueNumber:8,copiesAvailable:120,dispatch:new Date(now + 172_800_000).toISOString()})).status).toBe(200)
    expect((await mutation('admin_1',{action:'edition.delete',editionId:'edition_8',confirm:true})).status).toBe(200)
    expect(await db.prepare(`SELECT deleted_at FROM editions WHERE id='edition_8'`).first<{deleted_at:number}>()).toMatchObject({ deleted_at: expect.any(Number) })
    const dashboard=await getAdmin(await request('admin_1','/api/admin'))
    const body=await dashboard.json() as { editions:Array<{id:string}> }
    expect(body.editions.find(edition=>edition.id==='edition_8')).toBeUndefined()
  })

  it('reserves paid term copies in each monthly edition instead of all copies in the first edition', async () => {
    const now = Date.now()
    await registerCustomerCheckout(db, { id: 'term_inventory', userId: 'inventory_customer', planId: 'quarterly', planName: '3 months', durationMonths: 3, quantity: 2, currency: 'INR', amountMinor: 99900, now })
    await saveCustomerCheckoutDetails(db, { id: 'term_inventory', userId: 'inventory_customer', email: 'inventory@example.com', address: { name: 'Inventory Reader', line1: '1 Test Road', city: 'Pune', postalCode: '411001', country: 'IN' }, now })
    await applyCustomerPaymentSucceeded(db, { id: 'term_inventory', payerUserId: 'inventory_customer', paymentId: 'pay_inventory', paidAt: now, now })

    const response = await mutation('admin_1', { action: 'edition.create', label: 'Inventory edition', issueNumber: 9, copiesAvailable: 10, cutoff: new Date(now + 1_000).toISOString(), dispatch: new Date(now + 86_400_000).toISOString() })
    expect(response.status).toBe(200)
    expect(await db.prepare(`SELECT copies_available FROM editions WHERE id='edition_9'`).first()).toMatchObject({ copies_available: 8 })

    const dashboard = await getAdmin(await request('admin_1', '/api/admin'))
    const body = await dashboard.json() as { reports: { nextEdition: { copiesRequired: number; copiesAvailable: number } } }
    expect(body.reports.nextEdition).toMatchObject({ copiesRequired: 2, copiesAvailable: 8 })
  })

  it('creates an edition, generates paid eligibility, and exports a minimal dispatch CSV', async () => {
    const now = Date.now()
    await registerCustomerCheckout(db, { id: 'order_customer_1', userId: 'customer_1', planId: 'monthly', planName: 'Monthly', durationMonths: 1, quantity: 1, currency: 'INR', amountMinor: 79900, now })
    await saveCustomerCheckoutDetails(db, { id: 'order_customer_1', userId: 'customer_1', email: 'customer@example.com', address: { name: 'Customer', line1: '1 Test Road', city: 'Pune', postalCode: '411001', country: 'IN' }, now })
    await applyCustomerPaymentSucceeded(db, { id: 'order_customer_1', payerUserId: 'customer_1', paymentId: 'pay_test', paidAt: now, now })

    expect((await mutation('admin_1', { action: 'edition.create', label: 'September 2026', issueNumber: 1, cutoff: new Date(now + 1000).toISOString(), dispatch: new Date(now + 86400000).toISOString() })).status).toBe(200)
    const generated = await mutation('admin_1', { action: 'edition.generate', editionId: 'edition_1' })
    expect(await generated.json()).toMatchObject({ ok: true, count: 1 })
    expect((await mutation('admin_1', { action: 'edition.generate', editionId: 'edition_1' })).status).toBe(409)
    const snapshot = await db.prepare(`SELECT id FROM edition_eligibility_snapshots WHERE edition_id='edition_1'`).first<{id:string}>()
    await expect(db.prepare(`DELETE FROM edition_eligibility_snapshots WHERE id=?`).bind(snapshot!.id).run()).rejects.toThrow('cannot be deleted')
    await expect(db.prepare(`DELETE FROM customer_payments WHERE provider_payment_id='pay_test'`).run()).rejects.toThrow('cannot be deleted')
    expect((await mutation('admin_1', { action: 'edition.lock', editionId: 'edition_1', reason: 'Approved for the September print run' })).status).toBe(200)

    const grant = await getDispatchCsv(await request('admin_1', '/api/admin/dispatch?edition=edition_1'))
    expect(grant.status).toBe(303)
    const exportCookie=(grant.headers.get('set-cookie')??'').split(';')[0]
    const csv = await getDispatchCsv(await request('admin_1', '/api/admin/dispatch?edition=edition_1',{},exportCookie))
    const body = await csv.text()
    expect(csv.status).toBe(200)
    expect(body).toContain('customer@example.com')
    expect(body).toContain('1 Test Road')
    expect(body).not.toContain('pay_test')

    const dashboard = await getAdmin(await request('admin_1', '/api/admin'))
    const dashboardBody = await dashboard.json() as { subscriptions: Array<{pricing_snapshot: Record<string,unknown> | null; pricing_snapshot_json?: string}> }
    expect(dashboardBody.subscriptions[0]).toHaveProperty('pricing_snapshot')
    expect(dashboardBody.subscriptions[0]).not.toHaveProperty('pricing_snapshot_json')
  })

  it('writes an audit entry for every administrative mutation', async () => {
    await mutation('admin_1', { action: 'content.upsert', key: 'faq_delivery', title: 'Delivery', body: 'Delivery details.' })
    const response = await getAdmin(await request('admin_1', '/api/admin'))
    const body = await response.json() as { audits: Array<{ actor_user_id: string; action: string }> }
    expect(body.audits[0]).toMatchObject({ actor_user_id: 'admin_1', action: 'content.updated' })
  })

  it('keeps cancelled paid entitlement, excludes paused/refunded/failed terms, and enforces fulfilment transitions', async () => {
    process.env.FULFIL_PAID_AFTER_CANCELLATION='true'
    const now=Date.now(), statuses=['active','cancelled','paused','refunded','payment_failed','completed'] as const
    for (const status of statuses) {
      const id=`sub_${status}`, userId=`user_${status}`
      await registerCustomerCheckout(db,{id,userId,planId:'monthly',planName:'Monthly',durationMonths:1,quantity:status==='active'?2:1,currency:'INR',amountMinor:999,now})
      await saveCustomerCheckoutDetails(db,{id,userId,email:`${status}@example.com`,address:{name:status,line1:'1 Test Road',city:'Pune',postalCode:'411001',country:'IN'},now})
      if(status!=='payment_failed') await applyCustomerPaymentSucceeded(db,{id,payerUserId:userId,paymentId:`pay_${status}`,paidAt:now,now})
      await db.prepare(`UPDATE customer_subscriptions SET status=?, entitlement_status=? WHERE id=?`).bind(status,status==='refunded'?'refunded':status==='payment_failed'?'pending':status==='completed'?'exhausted':'paid',id).run()
    }
    await mutation('admin_1',{action:'edition.create',label:'October 2026',issueNumber:2,cutoff:new Date(now+1000).toISOString(),dispatch:new Date(now+86400000).toISOString()})
    const generated=await mutation('admin_1',{action:'edition.generate',editionId:'edition_2'})
    expect(await generated.json()).toMatchObject({ok:true,count:2})
    const decisions=await db.prepare(`SELECT subscription_id,decision,reason FROM edition_eligibility_snapshots WHERE edition_id='edition_2' ORDER BY subscription_id`).all<Record<string,unknown>>()
    expect(decisions.results.filter(row=>row.decision==='included').map(row=>row.subscription_id).sort()).toEqual(['sub_active','sub_cancelled'])
    expect(decisions.results.find(row=>row.subscription_id==='sub_paused')?.reason).toBe('Subscription is paused')
    expect(decisions.results.find(row=>row.subscription_id==='sub_refunded')?.reason).toBe('Subscription is refunded')
    await mutation('admin_1',{action:'edition.lock',editionId:'edition_2',reason:'Approved functional test list'})
    const fulfilmentId='edition_2_sub_active'
    for(const status of ['prepared','dispatched','delayed','replacement','prepared']) expect((await mutation('admin_1',{action:'fulfilment.status',fulfilmentId,status,trackingUrl:'https://courier.example/track'})).status).toBe(200)
    const subscription=await db.prepare(`SELECT copies_fulfilled,copies_total,status FROM customer_subscriptions WHERE id='sub_active'`).first<Record<string,unknown>>()
    expect(subscription).toMatchObject({copies_fulfilled:2,copies_total:2,status:'completed'})
    const activity=await db.prepare(`SELECT event_type,detail FROM account_events WHERE subscription_id='sub_active' ORDER BY created_at`).all<{event_type:string;detail:string}>()
    expect(activity.results.some(event=>event.event_type==='fulfilment_dispatched'&&event.detail.includes('courier.example'))).toBe(true)
    expect(activity.results.some(event=>event.event_type==='subscription_completed')).toBe(true)
    const fulfilment=await db.prepare(`SELECT courier FROM customer_fulfilments WHERE id=?`).bind(fulfilmentId).first<{courier:string}>()
    expect(fulfilment?.courier).toBe('courier.example')
  })
})
