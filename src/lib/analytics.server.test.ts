import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from './lifecycle/env.server'
import { createTestD1 } from './lifecycle/testing'
import { recordBrowserAnalytics, recordOperationalAnalytics } from './analytics.server'

const origin='https://example.com'
let db:D1Database

beforeEach(()=>{
  db=createTestD1()
  initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'analytics-test-secret-at-least-32-characters'})
})
afterEach(()=>resetRequestLifecycleBindings())

const request=(body:Record<string,unknown>)=>new Request(`${origin}/api/analytics`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})

describe('privacy-preserving first-party analytics',()=>{
  it('does not store optional browser analytics without consent',async()=>{
    expect((await recordBrowserAnalytics(request({event:'page_view',path:'/about',consent:false}))).status).toBe(422)
    expect((await db.prepare(`SELECT COUNT(*) total FROM first_party_analytics_events`).first<{total:number}>())?.total).toBe(0)
  })

  it('allowlists browser fields and strips query data, identifiers and coupon values',async()=>{
    const response=await recordBrowserAnalytics(request({event:'duration_selected',path:'/subscription?email=person@example.com&coupon=SECRET',value:'6',consent:true,email:'person@example.com',coupon:'SECRET'}))
    expect(response.status).toBe(200)
    const row=await db.prepare(`SELECT * FROM first_party_analytics_events`).first<Record<string,unknown>>()
    expect(row).toMatchObject({event_name:'duration_selected',path:'/subscription',dimension_value:'6',country_code:null})
    expect(JSON.stringify(row)).not.toContain('person@example.com')
    expect(JSON.stringify(row)).not.toContain('SECRET')
  })

  it('stores operational payment outcomes with country only',async()=>{
    await recordOperationalAnalytics(db,'payment_succeeded','in')
    const row=await db.prepare(`SELECT * FROM first_party_analytics_events`).first<Record<string,unknown>>()
    expect(row).toMatchObject({event_name:'payment_succeeded',country_code:'IN',path:null,dimension_value:null})
  })
})
