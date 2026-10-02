import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest'
import {createHmac} from 'node:crypto'
import {createTestD1} from './lifecycle/testing'
import {initRequestLifecycleBindings,resetRequestLifecycleBindings} from './lifecycle/env.server'
import {sessionCookie} from './auth.server'
import {registerCustomerCheckout} from './customer/store.server'
import {stripeCheckout,applyStripeInvoice,cancelStripeSubscription,stripeWebhook,syncStripePayments} from './stripe.endpoint.server'
import {verifyStripeWebhook} from './stripe.server'
import {createEdition,generateEditionEligibility} from './admin/store.server'
let db:D1Database
beforeEach(()=>{
  db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'stripe-test-lifecycle-secret-at-least-32-characters'})
  vi.stubEnv('SESSION_SECRET','stripe-test-session-secret-at-least-32-characters');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_fixture')
})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();resetRequestLifecycleBindings()})
async function seed(months=3){await registerCustomerCheckout(db,{id:'stripe_local',userId:'reader',planId:'stripe_plan',planName:'Plan',durationMonths:months,quantity:1,currency:'INR',amountMinor:55500,now:1,createPendingPayment:false});await db.prepare("UPDATE customer_subscriptions SET payment_provider='stripe',renewal_amount_minor=55500 WHERE id='stripe_local'").run()}
const subscription=(months=3)=>({id:'sub_provider',metadata:{local_subscription_id:'stripe_local',owner_id:'reader'},customer:'cus_reader',collection_method:'charge_automatically',cancel_at_period_end:false,items:{data:[{id:'si_reader',quantity:1,current_period_end:1798761600,price:{unit_amount:55500,recurring:{interval:'month',interval_count:months}}}]}})
const invoice=(id='in_first',reason='subscription_create',start=1782864000,end=1790812800)=>({id,status:'paid',paid:true,parent:{subscription_details:{subscription:'sub_provider'}},currency:'inr',billing_reason:reason,amount_paid:55500,amount_due:55500,amount_remaining:0,status_transitions:{paid_at:start},created:start,hosted_invoice_url:'https://invoice.stripe.com/test',lines:{data:[{parent:{subscription_item_details:{subscription_item:'si_reader'}},period:{start,end}}]}})
describe('Stripe automatic subscription billing',()=>{
  it.each([1,3,12])('creates subscription checkout recurring every %i months, never a one-time order',async months=>{
    const calls:URLSearchParams[]=[]
    vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{calls.push(new URLSearchParams(init.body));return Response.json({id:'cs_test_checkout',url:'https://checkout.stripe.com/c/test',expires_at:Date.now()/1000+3600})}))
    const cookie=await sessionCookie({user:{id:'reader'},csrf:'csrf',accessToken:'',refreshToken:'',expiresAt:Date.now()+60000})
    const request=()=>new Request('https://example.com/api/stripe/checkout',{method:'POST',headers:{Origin:'https://example.com',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({csrf:'csrf',idempotencyKey:'test_idempotency_key_123',durationMonths:months,quantity:1,email:'reader@example.com',phone:'+919999999999',address:{name:'Reader',line1:'1 Street',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'},acceptTerms:true})})
    expect((await stripeCheckout(request())).status).toBe(200)
    expect(calls[0].get('mode')).toBe('subscription');expect(calls[0].get('line_items[0][price_data][recurring][interval_count]')).toBe(String(months))
    expect((await stripeCheckout(request())).status).toBe(200);expect(calls).toHaveLength(1)
    expect(await db.prepare('SELECT COUNT(*) total FROM orders').first()).toEqual({total:1})
  })
  it('activates only paid invoices and grants exactly one term for each renewal despite retries',async()=>{
    await seed();await applyStripeInvoice(db,invoice(),subscription());await applyStripeInvoice(db,invoice(),subscription())
    expect(await db.prepare('SELECT copies_total,renewal_enabled,status FROM customer_subscriptions').first()).toMatchObject({copies_total:3,renewal_enabled:1,status:'active'})
    const renewal=invoice('in_renewal','subscription_cycle',1790812800,1798761600)
    await applyStripeInvoice(db,renewal,subscription());await applyStripeInvoice(db,renewal,subscription())
    expect(await db.prepare('SELECT copies_total,paid_through_at FROM customer_subscriptions').first()).toMatchObject({copies_total:6,paid_through_at:1798761600000})
    expect(await db.prepare("SELECT COUNT(*) total FROM customer_payments WHERE status='paid'").first()).toEqual({total:2})
    await applyStripeInvoice(db,{...invoice('in_unpaid'),paid:false,status:'open'},subscription())
    expect(await db.prepare('SELECT copies_total FROM customer_subscriptions').first()).toEqual({copies_total:6})
  })
  it('uses only the signed-in profile default address even when the browser sends another address',async()=>{
    await db.prepare("INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('user_saved','reader','customer','active',1,1)").run()
    await db.prepare("INSERT INTO customers(id,user_id,created_at,updated_at) VALUES('customer_saved','user_saved',1,1)").run()
    const {recordAddressVersion}=await import('./canonical-data.server')
    await recordAddressVersion(db,{ownerId:'reader',address:{name:'Saved Reader',line1:'Saved Road',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'},reason:'Test',now:Date.now()})
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:'cs_saved_profile',url:'https://checkout.stripe.com/c/test',expires_at:Date.now()/1000+3600})))
    const cookie=await sessionCookie({user:{id:'reader'},csrf:'csrf',accessToken:'',refreshToken:'',expiresAt:Date.now()+60000})
    const response=await stripeCheckout(new Request('https://example.com/api/stripe/checkout',{method:'POST',headers:{Origin:'https://example.com',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({csrf:'csrf',idempotencyKey:'saved_address_checkout_123',durationMonths:3,quantity:25,email:'reader@example.com',whatsapp:'+919999999999',useProfileAddress:true,address:{line1:'Browser supplied'},acceptTerms:true})}))
    expect(response.status).toBe(200)
    const row=await db.prepare('SELECT quantity,delivery_address_json,contact_phone FROM customer_subscriptions').first<any>()
    expect(row.quantity).toBe(25);expect(JSON.parse(row.delivery_address_json).line1).toBe('Saved Road')
    expect(await db.prepare('SELECT whatsapp_number FROM customers').first()).toMatchObject({whatsapp_number:'+919999999999'})
  })
  it('does not list an unpaid checkout as a customer subscription or admin subscriber',async()=>{
    await seed()
    const {listCustomerSubscriptions}=await import('./customer/store.server')
    const {customerDirectory}=await import('./admin/directory.server')
    await db.prepare("INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('user_pending','reader','customer','active',1,1)").run()
    expect((await listCustomerSubscriptions(db,'reader')).subscriptions).toHaveLength(0)
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?status=subscribers'))).total).toBe(0)
    await applyStripeInvoice(db,invoice(),subscription())
    expect((await listCustomerSubscriptions(db,'reader')).subscriptions).toHaveLength(1)
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?status=subscribers'))).total).toBe(1)
    await db.prepare("UPDATE customer_subscriptions SET status='cancelled' WHERE id='stripe_local'").run()
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?status=subscribers'))).total).toBe(0)
    await db.prepare("UPDATE customer_subscriptions SET status='active' WHERE id='stripe_local'").run()
    await db.prepare("UPDATE customer_payments SET status='refunded'").run()
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?status=subscribers'))).total).toBe(0)
  })
  it('accepts current Stripe paid invoices without the legacy paid boolean',async()=>{
    await seed();const paid=invoice();delete (paid as any).paid
    await applyStripeInvoice(db,paid,subscription())
    expect(await db.prepare('SELECT entitlement_status,starts_at FROM customer_subscriptions').first()).toMatchObject({entitlement_status:'paid',starts_at:paid.lines.data[0].period.start*1000})
  })
  it('reconciles a completed checkout for its owner and keeps payment/entitlement idempotent',async()=>{
    await seed()
    await db.prepare("INSERT INTO stripe_checkouts(id,owner_id,request_hash,checkout_session_id,first_amount_minor,renewal_amount_minor,created_at) VALUES('stripe_local','reader','hash','cs_saved',55500,55500,1)").run()
    const paid=invoice();delete (paid as any).paid
    const fetchMock=vi.fn(async(url)=>Response.json(String(url).includes('/checkout/sessions/')?{id:'cs_saved',mode:'subscription',status:'complete',client_reference_id:'stripe_local',metadata:{local_subscription_id:'stripe_local'},customer:'cus_reader',subscription:'sub_provider'}:String(url).includes('/subscriptions/')?subscription():{data:[paid],has_more:false}))
    vi.stubGlobal('fetch',fetchMock)
    await syncStripePayments(db,'other');expect(fetchMock).not.toHaveBeenCalled()
    await syncStripePayments(db,'reader');await syncStripePayments(db,'reader')
    expect(await db.prepare('SELECT status,entitlement_status,copies_total FROM customer_subscriptions').first()).toMatchObject({status:'active',entitlement_status:'paid',copies_total:3})
    expect(await db.prepare('SELECT COUNT(*) total FROM customer_payments').first()).toEqual({total:1})
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
  it('rejects reconciliation when provider checkout belongs to another subscription',async()=>{
    await seed()
    await db.prepare("INSERT INTO stripe_checkouts(id,owner_id,request_hash,checkout_session_id,first_amount_minor,renewal_amount_minor,created_at) VALUES('stripe_local','reader','hash','cs_saved',55500,55500,1)").run()
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({mode:'subscription',client_reference_id:'other',metadata:{local_subscription_id:'other'}})))
    await syncStripePayments(db,'reader')
    expect(await db.prepare('SELECT entitlement_status FROM customer_subscriptions').first()).toEqual({entitlement_status:'pending'})
    expect(await db.prepare('SELECT COUNT(*) total FROM customer_payments').first()).toEqual({total:0})
  })
  it('rejects amount, owner, duration and collection-method mismatches',async()=>{
    await seed()
    await expect(applyStripeInvoice(db,{...invoice(),amount_paid:1},subscription())).rejects.toThrow()
    await expect(applyStripeInvoice(db,invoice(),subscription(12))).rejects.toThrow()
    await expect(applyStripeInvoice(db,invoice(),{...subscription(),collection_method:'send_invoice'})).rejects.toThrow()
    await applyStripeInvoice(db,invoice(),{...subscription(),metadata:{local_subscription_id:'stripe_local',owner_id:'other'}})
    expect(await db.prepare('SELECT starts_at FROM customer_subscriptions').first()).toEqual({starts_at:null})
  })
  it('handles a failed invoice followed by payment without double-granting a term',async()=>{
    await seed()
    await db.prepare("INSERT INTO customer_payments(id,subscription_id,owner_id,provider_payment_id,status,amount_minor,currency,created_at,updated_at) VALUES('failed_invoice','stripe_local','reader','in_first','failed',55500,'INR',1,1)").run()
    await applyStripeInvoice(db,invoice(),subscription());await applyStripeInvoice(db,invoice(),subscription())
    expect(await db.prepare('SELECT copies_total FROM customer_subscriptions').first()).toEqual({copies_total:3})
    expect(await db.prepare('SELECT status FROM customer_payments').first()).toEqual({status:'paid'})
    expect(await db.prepare('SELECT COUNT(*) total FROM account_events').first()).toEqual({total:1})
  })
  it('applies a launch promotion only to the first term and stores the normal recurring price',async()=>{
    const calls:Array<{url:string;body:URLSearchParams}>=[]
    vi.stubGlobal('fetch',vi.fn(async(url,init)=>{calls.push({url:String(url),body:new URLSearchParams(init.body)});return Response.json(String(url).endsWith('/coupons')?{id:'coupon_first'}:{id:'cs_launch',url:'https://checkout.stripe.com/c/test',expires_at:Date.now()/1000+3600})}))
    const cookie=await sessionCookie({user:{id:'reader'},csrf:'csrf',accessToken:'',refreshToken:'',expiresAt:Date.now()+60000})
    const response=await stripeCheckout(new Request('https://example.com/api/stripe/checkout',{method:'POST',headers:{Origin:'https://example.com',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({csrf:'csrf',idempotencyKey:'launch_idempotency_key',durationMonths:12,quantity:1,discountCode:'LAUNCH159',email:'reader@example.com',phone:'+919999999999',address:{name:'Reader',line1:'1 Street',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'},acceptTerms:true})}))
    expect(response.status).toBe(200)
    expect(calls[0].body.get('duration')).toBe('once');expect(calls[0].body.get('amount_off')).toBe('19201')
    expect(calls[1].body.get('line_items[0][price_data][unit_amount]')).toBe('210001');expect(calls[1].body.get('discounts[0][coupon]')).toBe('coupon_first')
  })
  it('cancels future Stripe charges while preserving paid entitlement; failure never reports success',async()=>{
    await seed();await applyStripeInvoice(db,invoice(),subscription())
    const fetch=vi.fn(async(_url,init)=>{expect(new URLSearchParams(init.body).get('cancel_at_period_end')).toBe('true');return Response.json({id:'sub_provider'})});vi.stubGlobal('fetch',fetch)
    expect(await cancelStripeSubscription(db,'other','stripe_local')).toBe(false);expect(fetch).not.toHaveBeenCalled()
    expect(await cancelStripeSubscription(db,'reader','stripe_local')).toBe(true)
    expect(await db.prepare('SELECT renewal_enabled,copies_total,entitlement_status FROM customer_subscriptions').first()).toEqual({renewal_enabled:0,copies_total:3,entitlement_status:'paid'})
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('unavailable',{status:503})))
    await expect(cancelStripeSubscription(db,'reader','stripe_local')).rejects.toThrow()
  })
  it('keeps prepaid physical editions eligible after cancellation and the billing period ends',async()=>{
    await seed();await applyStripeInvoice(db,invoice(),{...subscription(),cancel_at_period_end:true})
    await db.prepare("UPDATE customer_subscriptions SET delivery_address_json=? WHERE id='stripe_local'").bind(JSON.stringify({name:'Reader',line1:'1 Road',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'})).run()
    const editionId=await createEdition(db,'admin',{label:'December 2026',issueNumber:99,cutoff:Date.parse('2026-11-20T12:00:00Z'),dispatch:Date.parse('2026-12-25T12:00:00Z')})
    expect(await generateEditionEligibility(db,'admin',editionId)).toBe(1)
    expect(await db.prepare('SELECT decision FROM edition_eligibility_snapshots WHERE edition_id=?').bind(editionId).first()).toEqual({decision:'included'})
  })
  it('verifies raw-body signatures and rejects old or forged webhook events',async()=>{
    const raw=JSON.stringify({id:'evt_test',type:'other',data:{object:{}}}),timestamp=Math.floor(Date.now()/1000)
    const signature=`t=${timestamp},v1=${createHmac('sha256','whsec_fixture').update(`${timestamp}.${raw}`).digest('hex')}`
    expect(verifyStripeWebhook(raw,signature)).toBe(true);expect(verifyStripeWebhook(raw+' ',signature)).toBe(false);expect(verifyStripeWebhook(raw,signature,Date.now()+600000)).toBe(false)
    const request=()=>new Request('https://example.com/api/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:raw})
    expect((await stripeWebhook(request())).status).toBe(200);expect((await stripeWebhook(request())).status).toBe(200)
    expect(await db.prepare('SELECT COUNT(*) total FROM stripe_webhook_receipts').first()).toEqual({total:1})
  })
})
