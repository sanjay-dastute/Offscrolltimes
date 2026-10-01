import { describe, expect, it } from 'vitest'
import { createTestD1 } from './lifecycle/testing'
import { recordCustomerOrder } from './canonical-data.server'
import { registerCustomerCheckout } from './customer/store.server'

describe('final canonical data model', () => {
  it('links orders and delivery addresses to the existing social-auth customer identity',async()=>{
    const db=createTestD1(),now=Date.now()
    await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('user_hashed','google:123','customer','active',?,?)`).bind(now,now).run()
    await db.prepare(`INSERT INTO customers(id,user_id,email,created_at,updated_at) VALUES('customer_hashed','user_hashed','reader@example.com',?,?)`).bind(now,now).run()
    await registerCustomerCheckout(db,{id:'test_order',userId:'google:123',planId:'monthly',planName:'Monthly',durationMonths:1,quantity:1,currency:'INR',amountMinor:19900,now})
    await recordCustomerOrder(db,{userId:'google:123',email:'reader@example.com',subscriptionId:'test_order',providerOrderId:'test_provider_order',currency:'INR',amountMinor:19900,pricingSnapshot:{totalMinor:19900},address:{name:'Reader',line1:'1 Test Street',city:'Pune',postalCode:'411001',country:'IN'},termsAcceptedAt:now})
    expect(await db.prepare('SELECT customer_id FROM orders').first()).toMatchObject({customer_id:'customer_hashed'})
    expect(await db.prepare('SELECT customer_id FROM addresses').first()).toMatchObject({customer_id:'customer_hashed'})
    expect(await db.prepare('SELECT COUNT(*) total FROM customers').first()).toMatchObject({total:1})
  })
  it('exposes every application entity through a table or canonical view', async () => {
    const db=createTestD1()
    const expected=[
      'users','auth_identities','oauth_transactions','sessions','mfa_factors','customers','addresses',
      'products','subscription_options','orders','payments','subscriptions','editions',
      'edition_eligibility','fulfilments','shipments','promotions','promotion_redemptions',
      'enquiries','refunds','account_events','audit_events',
    ]
    const schema=await db.prepare(`SELECT name,type FROM sqlite_master WHERE name IN (${expected.map(()=>'?').join(',')})`).bind(...expected).all<{name:string;type:string}>()
    expect(schema.results.map(row=>row.name).sort()).toEqual([...expected].sort())
  })

  it('stores canonical identity claims and restricts MFA factors to administrators', async () => {
    const db=createTestD1(),now=Date.now()
    const userColumns=await db.prepare(`PRAGMA table_info(users)`).all<{name:string}>()
    const identityColumns=await db.prepare(`PRAGMA table_info(auth_identities)`).all<{name:string}>()
    expect(userColumns.results.map(row=>row.name)).toContain('primary_email')
    expect(identityColumns.results.map(row=>row.name)).toContain('verified_claims_json')
    await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('customer','customer-owner','customer','active',?,?)`).bind(now,now).run()
    await expect(db.prepare(`INSERT INTO mfa_factors(id,user_id,encrypted_secret,created_at,updated_at) VALUES('factor','customer','ciphertext',?,?)`).bind(now,now).run()).rejects.toThrow('restricted to administrators')
  })
})
