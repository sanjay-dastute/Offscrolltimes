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
