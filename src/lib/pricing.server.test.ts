import { describe, expect, it } from 'vitest'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { calculatePricing } from './pricing.server'

describe('server-owned pricing', () => {
  it('prices every configured duration, supported country and boundary quantity consistently', async () => {
    const db = createTestD1()
    const durations = [1, 3, 12]
    const countries = ['IN']
    for (const durationMonths of durations) for (const countryCode of countries) for (const quantity of [1,2,10,25,100]) {
      const quote = await calculatePricing(db, { durationMonths, quantity, countryCode, now: Date.now() })
      expect(quote, `${durationMonths}m/${countryCode}/q${quantity}`).not.toBeNull()
      expect(quote?.subtotalMinor).toBe(19900 * durationMonths * quantity)
      expect(quote?.totalMinor).toBe((quote?.subtotalMinor ?? 0) - (quote?.durationDiscountMinor ?? 0) + (quote?.shippingMinor ?? 0) + (quote?.taxMinor ?? 0))
      expect(quote?.countryCode).toBe(countryCode)
    }
    expect(await calculatePricing(db,{durationMonths:6,quantity:1,countryCode:'IN',now:Date.now()})).toBeNull()
    expect(await calculatePricing(db,{durationMonths:1,quantity:1,countryCode:'GB',now:Date.now()})).toMatchObject({currency:'GBP',totalMinor:799})
  })
  it('calculates subtotal, duration saving, shipping and configured tax', async () => {
    const db = createTestD1()
    await db.prepare(`UPDATE admin_shipping_zones SET shipping_minor=200, additional_copy_minor=50, tax_rate_basis_points=1800 WHERE country_code='IN'`).run()
    const quote = await calculatePricing(db, { durationMonths: 3, quantity: 2, countryCode: 'IN', now: Date.now() })
    expect(quote).toMatchObject({ subtotalMinor: 119400, durationDiscountMinor: 8400, shippingMinor: 250, taxBasisPoints: 1800 })
    expect(quote?.taxMinor).toBe(20025)
    expect(quote?.totalMinor).toBe(131275)
  })

  it('uses the configured regional currency and monthly price for a delivery country', async () => {
    const db=createTestD1()
    await db.prepare(`DELETE FROM regional_subscription_prices WHERE country_code='GB'`).run()
    await db.prepare(`UPDATE admin_shipping_zones SET country_name='United Kingdom',currency='GBP',shipping_minor=500,additional_copy_minor=0,tax_rate_basis_points=0,regional_monthly_price_minor=750,active=1 WHERE country_code='GB'`).run()
    const quote=await calculatePricing(db,{durationMonths:1,quantity:2,countryCode:'GB',now:Date.now()})
    expect(quote).toMatchObject({currency:'GBP',monthlyPriceMinor:750,subtotalMinor:1500,shippingMinor:500,totalMinor:2000})
  })

  it('ignores inactive and expired offer codes', async () => {
    const db = createTestD1()
    await db.prepare(`INSERT INTO admin_discounts (id,code,kind,value,ends_at,active,created_at,updated_at) VALUES ('old','OLD','percentage',5000,?,1,0,0)`).bind(Date.now()-1).run()
    const quote = await calculatePricing(db, { durationMonths: 1, quantity: 1, countryCode: 'IN', discountCode: 'OLD', now: Date.now() })
    expect(quote?.offerDiscountMinor).toBe(0)
    expect(quote?.discountId).toBeNull()
  })

  it('enforces exhausted, customer-limited, duration, country, minimum and combination rules', async () => {
    const db = createTestD1(), now = Date.now()
    await db.prepare(`INSERT INTO admin_discounts (id,code,kind,value,usage_limit,eligible_durations_json,eligible_countries_json,per_customer_limit,minimum_duration_months,minimum_order_minor,combinable_with_duration_discount,starts_at,ends_at,active,created_at,updated_at) VALUES ('rules','RULES','percentage',1000,1,'[3]','["IN"]',1,3,5000,0,?,?,1,?,?)`).bind(now-1000,now+1000,now,now).run()
    expect((await calculatePricing(db,{durationMonths:1,quantity:1,countryCode:'IN',discountCode:'RULES',userId:'u1',now}))?.discountId).toBeNull()
    expect((await calculatePricing(db,{durationMonths:3,quantity:1,countryCode:'GB',discountCode:'RULES',userId:'u1',now}))?.discountId).toBeNull()
    const eligible=await calculatePricing(db,{durationMonths:3,quantity:1,countryCode:'IN',discountCode:'RULES',userId:'u1',now})
    expect(eligible?.discountId).toBe('rules')
    expect(eligible?.durationDiscountMinor).toBeGreaterThan(0)
    await db.prepare(`INSERT INTO customer_subscriptions(id,owner_id,plan_id,plan_name,duration_months,quantity,status,currency,amount_minor,copies_total,renewal_enabled,created_at,updated_at) VALUES('s1','u1','p','P',1,1,'upcoming','USD',1,1,0,?,?)`).bind(now,now).run()
    await db.prepare(`INSERT INTO discount_redemptions(id,discount_id,subscription_id,owner_id,created_at) VALUES('r1','rules','s1','u1',?)`).bind(now).run()
    expect((await calculatePricing(db,{durationMonths:3,quantity:1,countryCode:'IN',discountCode:'RULES',userId:'u1',now}))?.discountId).toBeNull()
  })

  it('stacks an influencer referral with the plan and launch discounts', async () => {
    const db=createTestD1(),now=Date.now()
    await db.prepare(`INSERT INTO influencer_referral_codes(id,code,discount_basis_points,created_at,updated_at) VALUES('creator','CREATOR20',2000,?,?)`).bind(now,now).run()
    await db.prepare(`INSERT INTO admin_discounts(id,code,kind,value,active,created_at,updated_at) VALUES('launch','LAUNCH','percentage',1000,1,?,?)`).bind(now,now).run()
    const quote=await calculatePricing(db,{durationMonths:3,quantity:1,countryCode:'IN',discountCode:'LAUNCH',referralCode:'CREATOR20',userId:'new-customer',now})
    expect(quote?.durationDiscountMinor).toBeGreaterThan(0)
    expect(quote?.offerDiscountMinor).toBeGreaterThan(0)
    expect(quote?.referralDiscountMinor).toBeGreaterThan(0)
    expect(quote?.referralCode).toBe('CREATOR20')
  })

  it('prevents a historical commercial order from being rewritten or deleted', async () => {
    const db=createTestD1(),now=Date.now()
    await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('u-order','google:order-user','customer','active',?,?)`).bind(now,now).run()
    await db.prepare(`INSERT INTO customers(id,user_id,email,transactional_contact_basis,created_at,updated_at) VALUES('c-order','u-order','order@example.com','contract',?,?)`).bind(now,now).run()
    await db.prepare(`INSERT INTO customer_subscriptions(id,owner_id,plan_id,plan_name,duration_months,quantity,status,currency,amount_minor,copies_total,renewal_enabled,created_at,updated_at) VALUES('s-order','google:order-user','p','Plan',1,1,'upcoming','USD',999,1,0,?,?)`).bind(now,now).run()
    await db.prepare(`INSERT INTO orders(id,customer_id,subscription_id,provider_order_id,currency,amount_minor,pricing_snapshot_json,delivery_address_snapshot_json,terms_accepted_at,created_at) VALUES('o-order','c-order','s-order','provider-order','USD',999,'{"totalMinor":999}','{}',?,?)`).bind(now,now).run()
    await expect(db.prepare(`UPDATE orders SET amount_minor=1 WHERE id='o-order'`).run()).rejects.toThrow('commercial orders are immutable')
    await expect(db.prepare(`DELETE FROM orders WHERE id='o-order'`).run()).rejects.toThrow('commercial orders are immutable')
  })
})
