import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestD1 } from './lifecycle/testing'
import { registerCustomerCheckout } from './customer/store.server'
import { alignNovemberRenewal } from './stripe-launch.server'
import { novemberLaunchTerm } from './dates'

afterEach(()=>vi.unstubAllGlobals())
const paidAt=Date.parse('2026-10-02T12:00:00Z')
async function setup(months:number) {
  const db=createTestD1()
  await registerCustomerCheckout(db,{id:'launch_local',userId:'reader',planId:'plan',planName:'Plan',durationMonths:months,quantity:1,currency:'INR',amountMinor:55500,now:paidAt,createPendingPayment:false})
  await db.prepare("UPDATE customer_subscriptions SET payment_provider='stripe',status='active',entitlement_status='paid' WHERE id='launch_local'").run()
  await db.prepare("INSERT INTO customer_payments(id,subscription_id,owner_id,status,amount_minor,currency,paid_at,created_at,updated_at) VALUES('launch_payment','launch_local','reader','paid',55500,'INR',?,?,?)").bind(paidAt,paidAt,paidAt).run()
  const subscription={id:'sub_launch',status:'active',metadata:{local_subscription_id:'launch_local',owner_id:'reader'},items:{data:[{current_period_end:1}]}}
  return {db,subscription}
}
describe('November launch renewal alignment',()=>{
  it.each([1,3,12])('starts November 1 and renews after %i months without creating a charge',async months=>{
    const {db,subscription}=await setup(months),term=novemberLaunchTerm(paidAt,months)!
    const fetchMock=vi.fn(async(url,init)=>{
      expect(String(url)).toBe('https://api.stripe.com/v1/subscriptions/sub_launch')
      const params=new URLSearchParams(init.body)
      expect(params.get('proration_behavior')).toBe('none');expect(params.get('trial_end')).toBe(String(term.end/1000))
      return Response.json({...subscription,status:'trialing',trial_end:term.end/1000,metadata:{...subscription.metadata,edition_renewal_at:String(term.end/1000)},items:{data:[{current_period_end:term.end/1000}]}})
    });vi.stubGlobal('fetch',fetchMock)
    const aligned=await alignNovemberRenewal(db,subscription,'sk_test_fixture')
    await alignNovemberRenewal(db,aligned,'sk_test_fixture')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await db.prepare('SELECT starts_at,ends_at,paid_through_at,renewal_at,copies_total FROM customer_subscriptions').first()).toEqual({starts_at:term.start,ends_at:term.end,paid_through_at:term.end,renewal_at:term.end,copies_total:months})
  })
  it('does not change another owner or an unpaid or cancelled subscription',async()=>{
    const {db,subscription}=await setup(3),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock)
    await alignNovemberRenewal(db,{...subscription,metadata:{...subscription.metadata,owner_id:'other'}},'sk_test_fixture')
    await db.prepare("UPDATE customer_payments SET status='pending'").run()
    await alignNovemberRenewal(db,subscription,'sk_test_fixture')
    await db.prepare("UPDATE customer_payments SET status='paid'").run()
    await db.prepare("UPDATE customer_subscriptions SET status='cancelled'").run()
    await alignNovemberRenewal(db,subscription,'sk_test_fixture')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('does not record a renewal date Stripe did not confirm',async()=>{
    const {db,subscription}=await setup(3)
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json(subscription)))
    await expect(alignNovemberRenewal(db,subscription,'sk_test_fixture')).rejects.toThrow('not confirmed')
    expect(await db.prepare('SELECT renewal_at FROM customer_subscriptions').first()).toEqual({renewal_at:null})
  })
})
