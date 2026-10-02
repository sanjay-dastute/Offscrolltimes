import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {createTestD1} from './lifecycle/testing'
import {registerCustomerCheckout} from './customer/store.server'
import {cancelAndRefundStripe,recordStripeCancellationRefund,REFUND_WINDOW_MS} from './stripe-refund.server'
import {applyStripeInvoice} from './stripe.endpoint.server'
let db:D1Database,now:number
const subscription={id:'sub_reader',customer:'cus_reader',collection_method:'charge_automatically',metadata:{owner_id:'reader',local_subscription_id:'local_refund'},items:{data:[{id:'si_reader',quantity:1,price:{unit_amount:55500,recurring:{interval:'month',interval_count:3}}}]}}
const invoice={id:'in_reader',customer:'cus_reader',status:'paid',amount_paid:55500,amount_due:55500,amount_remaining:0,currency:'inr',billing_reason:'subscription_create',parent:{subscription_details:{subscription:'sub_reader'}},payments:{data:[{status:'paid',payment:{type:'payment_intent',payment_intent:'pi_reader'}}]},lines:{data:[{parent:{subscription_item_details:{subscription_item:'si_reader'}},period:{start:1,end:1000}}]},created:1}
const refund=(status='succeeded')=>({id:'re_reader',status,amount:55500,currency:'inr',payment_intent:'pi_reader',metadata:{owner_id:'reader',local_subscription_id:'local_refund',local_payment_id:'payment_reader'}})
beforeEach(async()=>{db=createTestD1();now=Date.now();vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture');await registerCustomerCheckout(db,{id:'local_refund',userId:'reader',planId:'plan',planName:'Plan',durationMonths:3,quantity:1,currency:'INR',amountMinor:55500,now:1,createPendingPayment:false});await db.prepare("UPDATE customer_subscriptions SET payment_provider='stripe',stripe_subscription_id='sub_reader',renewal_amount_minor=55500,entitlement_status='paid' WHERE id='local_refund'").run();await db.prepare("INSERT INTO customer_payments(id,subscription_id,owner_id,provider_payment_id,status,amount_minor,currency,paid_at,created_at,updated_at) VALUES('payment_reader','local_refund','reader','in_reader','paid',55500,'INR',?,?,?)").bind(now-3600000,now,now).run()})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
function provider(status='succeeded'){
  return vi.fn(async(url:any,init:any)=>{
    const path=new URL(String(url)).pathname
    if(path.startsWith('/v1/invoices/'))return Response.json(invoice)
    if(path.startsWith('/v1/payment_intents/'))return Response.json({id:'pi_reader',customer:'cus_reader',status:'succeeded',amount_received:55500,currency:'inr'})
    if(path==='/v1/refunds'&&init.method==='POST')return Response.json(refund(status))
    if(path.startsWith('/v1/refunds/'))return Response.json(refund(status))
    return Response.json({...subscription,status:init.method==='DELETE'?'canceled':'active'})
  })
}
it('refunds only the verified customer payment and retries cannot refund twice or restore refunded entitlement',async()=>{
  const fetch=provider();vi.stubGlobal('fetch',fetch)
  expect(await cancelAndRefundStripe(db,'reader','local_refund',now)).toBe('succeeded')
  await cancelAndRefundStripe(db,'reader','local_refund',now)
  await recordStripeCancellationRefund(db,refund())
  await applyStripeInvoice(db,invoice,subscription)
  const refunds=fetch.mock.calls.filter(([url,init])=>String(url).endsWith('/refunds')&&init.method==='POST')
  expect(refunds).toHaveLength(1)
  expect(new URLSearchParams(refunds[0][1].body).get('payment_intent')).toBe('pi_reader')
  expect(refunds[0][1].headers['Idempotency-Key']).toBe('refund-48h-payment_reader')
  expect(await db.prepare('SELECT status FROM customer_payments').first()).toEqual({status:'refunded'})
  expect(await db.prepare('SELECT status,renewal_enabled,copies_total FROM customer_subscriptions').first()).toEqual({status:'refunded',renewal_enabled:0,copies_total:3})
  expect(await db.prepare('SELECT COUNT(*) total FROM refunds').first()).toEqual({total:1})
})
it('rejects other owners and the exact 48-hour boundary without contacting Stripe',async()=>{
  const fetch=provider();vi.stubGlobal('fetch',fetch)
  await expect(cancelAndRefundStripe(db,'other','local_refund',now)).rejects.toThrow()
  await expect(cancelAndRefundStripe(db,'reader','local_refund',now-3600000+REFUND_WINDOW_MS)).rejects.toThrow('window has closed')
  expect(fetch).not.toHaveBeenCalled()
})
it('shows processing until Stripe succeeds and applies the entitlement change exactly once',async()=>{
  vi.stubGlobal('fetch',provider('pending'))
  expect(await cancelAndRefundStripe(db,'reader','local_refund',now)).toBe('pending')
  expect(await db.prepare('SELECT provider_status FROM refunds').first()).toEqual({provider_status:'processing'})
  expect(await db.prepare('SELECT status FROM customer_payments').first()).toEqual({status:'paid'})
  await recordStripeCancellationRefund(db,refund());await recordStripeCancellationRefund(db,refund())
  expect(await db.prepare('SELECT copies_total FROM customer_subscriptions').first()).toEqual({copies_total:3})
})
it('rejects a payment belonging to a different Stripe customer',async()=>{
  const fetch=provider();vi.stubGlobal('fetch',vi.fn(async(url,init)=>String(url).includes('/payment_intents/')?Response.json({customer:'cus_other',status:'succeeded',amount_received:55500,currency:'inr'}):fetch(url,init)))
  await expect(cancelAndRefundStripe(db,'reader','local_refund',now)).rejects.toThrow('does not match this customer')
  expect(await db.prepare('SELECT COUNT(*) total FROM refunds').first()).toEqual({total:0})
})
