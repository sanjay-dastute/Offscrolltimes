import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessionCookie, type SessionData } from '#/lib/auth.server'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from '#/lib/lifecycle/env.server'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { getCustomerDashboard, isAddressChangeBeforeCutoff, patchCustomerDashboard } from './endpoint.server'
import { listCustomerSubscriptions, registerCustomerCheckout } from './store.server'
import { firstEditionTimestamp } from '#/lib/dates'
import { testing as authTesting } from '#/lib/auth.server'
import { customerDirectory } from '#/lib/admin/directory.server'

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
  it('persists identity, contact and address details and exposes them in the admin directory',async()=>{
    const identity=await authTesting.persistSocialIdentity('google','profile-test-subject','login@example.com',undefined,{name:'Original Reader'})
    const change=(body:Record<string,unknown>)=>requestFor(identity.ownerId,'/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:`csrf-${identity.ownerId}`,...body})}).then(patchCustomerDashboard)
    const initial=await customerDirectory(db,new URL('https://example.com/api/admin/customers'))
    expect(initial.customers[0]).toMatchObject({display_name:'Original Reader',email:'login@example.com'})
    expect((await change({action:'profile.contact',name:'Updated Reader',email:'contact@example.com',phone:'+919999999999',whatsapp:'+918888888888'})).status).toBe(200)
    const address={name:'Updated Reader',line1:'1 Reader Street',line2:'Floor 2',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'}
    expect((await change({action:'profile.address',address})).status).toBe(200)
    const directory=await customerDirectory(db,new URL('https://example.com/api/admin/customers?query=contact%40example.com'))
    expect(directory.customers).toHaveLength(1)
    expect(directory.customers[0]).toMatchObject({display_name:'Updated Reader',email:'contact@example.com',phone:'+918888888888',whatsapp_number:'+918888888888',address,subscription_count:0,payment_status:null})
    const reloaded=await getCustomerDashboard(await requestFor(identity.ownerId,'/api/customer'))
    expect(await reloaded.json()).toMatchObject({profile:{display_name:'Updated Reader',email:'contact@example.com',phone:'+918888888888',whatsapp_number:'+918888888888'},address})
    await authTesting.persistSocialIdentity('google','profile-test-subject','login@example.com',undefined,{name:'Provider Name'})
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers'))).customers[0]).toMatchObject({display_name:'Updated Reader',email:'contact@example.com'})
  })
  it('lets a registered customer save a profile address without a subscription',async()=>{
    await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('user_profile','profile_owner','customer','active',1,1)`).run()
    const address={name:'Reader',line1:'1 Test Road',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'}
    const response=await patchCustomerDashboard(await requestFor('profile_owner','/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.address',csrf:'csrf-profile_owner',address})}))
    expect(response.status).toBe(200)
    const missingRegion=await patchCustomerDashboard(await requestFor('profile_owner','/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.address',csrf:'csrf-profile_owner',address:{...address,region:''}})}))
    expect(missingRegion.status).toBe(422)
    const dashboard=await getCustomerDashboard(await requestFor('profile_owner','/api/customer'))
    expect(await dashboard.json()).toMatchObject({address,subscriptions:[]})
    const other=await getCustomerDashboard(await requestFor('other_owner','/api/customer'))
    expect(await other.json()).toMatchObject({address:null})
  })
  it('updates only the signed-in customer contact profile and validates WhatsApp and CSRF',async()=>{
    for(const index of [1,2])await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES(?,?,'customer','active',1,1)`).bind(`user_${index}`,`owner_${index}`).run()
    const change=(body:Record<string,unknown>)=>requestFor('owner_1','/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.contact',csrf:'csrf-owner_1',name:'Reader',email:'reader@example.com',phone:'+919999999999',whatsapp:'+917373050093',...body})}).then(patchCustomerDashboard)
    expect((await change({userId:'user_2'})).status).toBe(200)
    expect(await db.prepare('SELECT user_id,whatsapp_number FROM customers').first()).toMatchObject({user_id:'user_1',whatsapp_number:'+917373050093'})
    expect((await change({csrf:'wrong'})).status).toBe(403)
    expect((await change({whatsapp:'7373050093'})).status).toBe(422)
    expect((await change({whatsapp:''})).status).toBe(422)
    const response=await getCustomerDashboard(await requestFor('owner_1','/api/customer'))
    expect(await response.json()).toMatchObject({profile:{display_name:'Reader',whatsapp_number:'+917373050093'}})
  })
  it('saves one profile address for all owned subscriptions without changing another customer',async()=>{
    await db.prepare("INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('user_shared','shared_owner','customer','active',1,1)").run()
    for(const [id,owner] of [['shared_one','shared_owner'],['shared_two','shared_owner'],['other_one','other_owner']])await registerCustomerCheckout(db,{id,userId:owner,planId:'plan',planName:'Plan',durationMonths:3,quantity:1,currency:'INR',amountMinor:55500,now:1})
    const address={name:'Reader',line1:'One Default Road',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'}
    const response=await patchCustomerDashboard(await requestFor('shared_owner','/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.address',csrf:'csrf-shared_owner',address})}))
    expect(response.status).toBe(200)
    const rows=await db.prepare("SELECT delivery_address_json FROM customer_subscriptions WHERE owner_id='shared_owner'").all<{delivery_address_json:string}>()
    expect(rows.results).toHaveLength(2)
    for(const row of rows.results)expect(JSON.parse(row.delivery_address_json)).toMatchObject(address)
    expect(await db.prepare("SELECT delivery_address_json FROM customer_subscriptions WHERE owner_id='other_owner'").first()).toMatchObject({delivery_address_json:null})
    expect(await (await getCustomerDashboard(await requestFor('shared_owner','/api/customer'))).json()).toMatchObject({address})
  })
  it('uses the India business timezone at the exact address cut-off boundary', () => {
    expect(isAddressChangeBeforeCutoff(Date.parse('2026-08-20T18:29:59.999Z'))).toBe(true)
    expect(isAddressChangeBeforeCutoff(Date.parse('2026-08-20T18:30:00.000Z'))).toBe(false)
    expect(isAddressChangeBeforeCutoff(Date.parse('2026-08-20T22:30:00.000Z'), 'Europe/London')).toBe(true)
  })
  it('stores dispatch boundaries as UTC timestamps derived from the business timezone', () => {
    expect(new Date(firstEditionTimestamp(Date.parse('2026-08-20T18:29:59.999Z'))).toISOString()).toBe('2026-09-25T04:30:00.000Z')
    expect(new Date(firstEditionTimestamp(Date.parse('2026-08-20T18:30:00.000Z'))).toISOString()).toBe('2026-10-25T04:30:00.000Z')
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


describe('required customer onboarding',()=>{
  it('rejects every missing primary field before storing contact data and collects the complete profile',async()=>{
    await db.prepare("INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('user_new','new_owner','customer','active',1,1)").run()
    const body={action:'profile.complete',csrf:'csrf-new_owner',name:'New Reader',email:'new@example.com',whatsapp:'+919999999999',address:{name:'New Reader',line1:'1 Test Street',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'}}
    const submit=(value:unknown)=>requestFor('new_owner','/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}).then(patchCustomerDashboard)
    for(const key of ['name','email','whatsapp'])expect((await submit({...body,[key]:''})).status).toBe(422)
    for(const key of Object.keys(body.address))expect((await submit({...body,address:{...body.address,[key]:''}})).status).toBe(422)
    expect(await db.prepare("SELECT id FROM customers WHERE user_id='user_new'").first()).toBeNull()
    expect((await submit(body)).status).toBe(200)
    const response=await getCustomerDashboard(await requestFor('new_owner','/api/customer'))
    expect(await response.json()).toMatchObject({profileComplete:true,profile:{display_name:'New Reader',email:'new@example.com',whatsapp_number:'+919999999999'},address:body.address})
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers'))).customers[0]).toMatchObject({display_name:'New Reader',address:body.address})
  })
})
