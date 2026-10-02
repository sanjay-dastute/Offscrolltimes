import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {createTestD1} from '#/lib/lifecycle/testing'
import {initRequestLifecycleBindings,resetRequestLifecycleBindings} from '#/lib/lifecycle/env.server'
import {testing,sessionCookie,readSession} from '#/lib/auth.server'
import {createPrivacyRequest,registerCustomerCheckout} from '#/lib/customer/store.server'
import {customerDirectory} from './directory.server'
import {deleteRequestedCustomer} from './deletion.server'
let db:D1Database
beforeEach(()=>{db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'deletion-test-secret-at-least-32-characters'});vi.stubEnv('SESSION_SECRET','deletion-session-secret-at-least-32-characters');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture')})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();resetRequestLifecycleBindings()})
it('filters deletion requests, erases profile data and blocks sessions and future sign-in',async()=>{
  const identity=await testing.persistSocialIdentity('google','delete_reader','reader@example.com',undefined,{name:'Reader'})
  const requestId=await createPrivacyRequest(db,identity.ownerId,'deletion',Date.now())
  const cookie=await sessionCookie({user:{id:identity.ownerId},csrf:'csrf',accessToken:'',refreshToken:'',expiresAt:Date.now()+60000})
  const request=new Request('https://example.com/api/customer',{headers:{Cookie:cookie}})
  expect(await readSession(request)).not.toBeNull()
  expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?status=deletion'))).total).toBe(1)
  await expect(deleteRequestedCustomer(db,'admin','wrong_user',requestId)).rejects.toThrow()
  await deleteRequestedCustomer(db,'admin',identity.userId,requestId)
  expect(await readSession(request)).toBeNull()
  expect(await db.prepare('SELECT COUNT(*) total FROM customers').first()).toEqual({total:0})
  expect(await db.prepare('SELECT COUNT(*) total FROM auth_identities').first()).toEqual({total:0})
  expect(await db.prepare('SELECT account_state,primary_email FROM users WHERE id=?').bind(identity.userId).first()).toEqual({account_state:'deleted',primary_email:null})
  await expect(testing.persistSocialIdentity('google','delete_reader','reader@example.com')).rejects.toThrow('account_unavailable')
  expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers'))).total).toBe(0)
})
it('does not erase data when Stripe cannot confirm cancellation',async()=>{
  const identity=await testing.persistSocialIdentity('google','cancel_reader','reader@example.com')
  const requestId=await createPrivacyRequest(db,identity.ownerId,'deletion',Date.now())
  await registerCustomerCheckout(db,{id:'stripe_delete',userId:identity.ownerId,planId:'plan',planName:'Plan',durationMonths:3,quantity:1,currency:'INR',amountMinor:55500,now:1,createPendingPayment:false})
  await db.prepare("UPDATE customer_subscriptions SET payment_provider='stripe',stripe_subscription_id='sub_delete' WHERE id='stripe_delete'").run()
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'unavailable'},{status:503})))
  await expect(deleteRequestedCustomer(db,'admin',identity.userId,requestId)).rejects.toThrow()
  expect(await db.prepare('SELECT email FROM customers WHERE user_id=?').bind(identity.userId).first()).toEqual({email:'reader@example.com'})
  expect(await db.prepare('SELECT account_state FROM users WHERE id=?').bind(identity.userId).first()).toEqual({account_state:'restricted'})
  expect(await db.prepare('SELECT status FROM customer_privacy_requests WHERE id=?').bind(requestId).first()).toEqual({status:'received'})
})

it('deletes a paid account profile while stopping renewals and preserving protected order history',async()=>{
  const identity=await testing.persistSocialIdentity('google','paid_reader','paid@example.com')
  const requestId=await createPrivacyRequest(db,identity.ownerId,'deletion',Date.now())
  await registerCustomerCheckout(db,{id:'stripe_paid_delete',userId:identity.ownerId,planId:'plan',planName:'Plan',durationMonths:3,quantity:1,currency:'INR',amountMinor:55500,now:1,createPendingPayment:false})
  await db.prepare("UPDATE customer_subscriptions SET payment_provider='stripe',stripe_subscription_id='sub_delete',entitlement_status='paid' WHERE id='stripe_paid_delete'").run()
  await db.prepare("INSERT INTO orders(id,customer_id,subscription_id,currency,amount_minor,pricing_snapshot_json,delivery_address_snapshot_json,terms_accepted_at,created_at) SELECT 'order_paid',id,'stripe_paid_delete','INR',55500,'{}','{}',1,1 FROM customers WHERE user_id=?").bind(identity.userId).run()
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:'sub_delete',cancel_at_period_end:true})))
  await deleteRequestedCustomer(db,'admin',identity.userId,requestId)
  expect(await db.prepare('SELECT email,phone,display_name FROM customers WHERE user_id=?').bind(identity.userId).first()).toEqual({email:null,phone:null,display_name:null})
  expect(await db.prepare("SELECT status,entitlement_status,renewal_enabled FROM customer_subscriptions WHERE id='stripe_paid_delete'").first()).toEqual({status:'cancelled',entitlement_status:'exhausted',renewal_enabled:0})
  expect(await db.prepare("SELECT COUNT(*) total FROM orders WHERE id='order_paid'").first()).toEqual({total:1})
})
