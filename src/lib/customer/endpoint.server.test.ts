import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessionCookie, type SessionData } from '#/lib/auth.server'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from '#/lib/lifecycle/env.server'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { getCustomerDashboard, isAddressChangeBeforeCutoff, patchCustomerDashboard } from './endpoint.server'
import { listCustomerSubscriptions, registerCustomerCheckout } from './store.server'
import { firstEditionTimestamp } from '#/lib/dates'

const origin = 'https://example.com'
let db: D1Database

async function authCookie(userId: string) {
  const session: SessionData = {
    accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000,
    user: { id: userId, name: userId }, csrf: `csrf-${userId}`,
  }
  return sessionCookie(session)
}

async function requestFor(userId: string, path: string, init: RequestInit = {}) {
  const cookie = await authCookie(userId)
  return new Request(`${origin}${path}`, {
    ...init,
    headers: { Origin: origin, Cookie: cookie, ...(init.headers ?? {}) },
  })
}

beforeEach(() => {
  process.env.SESSION_SECRET = 'customer-tests-session-secret-at-least-32-characters'
  db = createTestD1()
  initRequestLifecycleBindings({
    LIFECYCLE_DB: db,
    LIFECYCLE_SECRET: 'customer-tests-lifecycle-secret-at-least-32-chars',
  })
})

afterEach(() => resetRequestLifecycleBindings())

describe('customer role and ownership endpoints', () => {
  it('updates only the signed-in customer contact profile and validates WhatsApp and CSRF',async()=>{
    for(const index of [1,2])await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES(?,?,'customer','active',1,1)`).bind(`user_${index}`,`owner_${index}`).run()
    const change=(body:Record<string,unknown>)=>requestFor('owner_1','/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.contact',csrf:'csrf-owner_1',name:'Reader',email:'reader@example.com',phone:'',whatsapp:'+917373050093',...body})}).then(patchCustomerDashboard)
    expect((await change({userId:'user_2'})).status).toBe(200)
    expect(await db.prepare('SELECT user_id,whatsapp_number FROM customers').first()).toMatchObject({user_id:'user_1',whatsapp_number:'+917373050093'})
    expect((await change({csrf:'wrong'})).status).toBe(403)
    expect((await change({whatsapp:'7373050093'})).status).toBe(422)
    const response=await getCustomerDashboard(await requestFor('owner_1','/api/customer'))
    expect(await response.json()).toMatchObject({profile:{display_name:'Reader',whatsapp_number:'+917373050093'}})
  })
  it('uses the India business timezone at the exact address cut-off boundary', () => {
    expect(isAddressChangeBeforeCutoff(Date.parse('2026-08-20T18:29:59.999Z'))).toBe(true)
    expect(isAddressChangeBeforeCutoff(Date.parse('2026-08-20T18:30:00.000Z'))).toBe(false)
    expect(isAddressChangeBeforeCutoff(Date.parse('2026-08-20T22:30:00.000Z'), 'Europe/London')).toBe(true)
  })
  it('stores dispatch boundaries as UTC timestamps derived from the business timezone', () => {
    expect(new Date(firstEditionTimestamp(Date.parse('2026-08-20T18:29:59.999Z'))).toISOString()).toBe('2026-09-05T04:30:00.000Z')
    expect(new Date(firstEditionTimestamp(Date.parse('2026-08-20T18:30:00.000Z'))).toISOString()).toBe('2026-10-05T04:30:00.000Z')
  })
  it('rejects an anonymous dashboard request', async () => {
    const response = await getCustomerDashboard(new Request(`${origin}/api/customer`))
    expect(response.status).toBe(401)
  })

  it('returns only subscriptions owned by the authenticated customer', async () => {
    const now = Date.now()
    await registerCustomerCheckout(db, { id: 'checkout_owner1', userId: 'user_a', planId: 'plan_a', planName: 'Monthly', durationMonths: 1, quantity: 1, currency: 'USD', amountMinor: 999, now })
    await registerCustomerCheckout(db, { id: 'checkout_owner2', userId: 'user_b', planId: 'plan_b', planName: 'Annual', durationMonths: 12, quantity: 1, currency: 'USD', amountMinor: 8999, now })
    const response = await getCustomerDashboard(await requestFor('user_a', '/api/customer'))
    const body = await response.json() as { subscriptions: Array<{ id: string }> }
    expect(response.status).toBe(200)
    expect(body.subscriptions.map(item => item.id)).toEqual(['checkout_owner1'])
  })

  it('does not allow one customer to cancel another customer subscription', async () => {
    await registerCustomerCheckout(db, { id: 'checkout_private', userId: 'user_b', planId: 'plan_b', planName: 'Annual', durationMonths: 12, quantity: 1, currency: 'USD', amountMinor: 8999, now: Date.now() })
    const request = await requestFor('user_a', '/api/customer', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: 'csrf-user_a', subscriptionId: 'checkout_private', action: 'cancel' }),
    })
    expect((await patchCustomerDashboard(request)).status).toBe(404)
    expect((await listCustomerSubscriptions(db, 'user_b')).subscriptions[0]?.status).toBe('upcoming')
  })
})
