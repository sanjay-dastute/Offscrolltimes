import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from './lifecycle/env.server'
import { createTestD1 } from './lifecycle/testing'
import { recordBrowserAnalytics, recordOperationalAnalytics } from './analytics.server'
import { sessionCookie } from './auth.server'
import { getAdminDashboard } from './admin/store.server'

const origin='https://example.com'
let db:D1Database

beforeEach(()=>{
  db=createTestD1()
  initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'analytics-test-secret-at-least-32-characters'})
})
afterEach(()=>resetRequestLifecycleBindings())

const request=(body:Record<string,unknown>)=>new Request(`${origin}/api/analytics`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({visitorId:'12345678-1234-1234-1234-123456789012',...body})})

describe('privacy-preserving first-party analytics',()=>{
  it('deduplicates a signed-in account across devices and assigns one first location',async()=>{process.env.SESSION_SECRET='analytics-session-test-secret-at-least-32-characters';const cookie=await sessionCookie({accessToken:'',refreshToken:'',expiresAt:Date.now()+60000,user:{id:'viewer_account'},csrf:'test'});for(const visitorId of ['12345678-1234-1234-1234-123456789012','12345678-1234-1234-1234-123456789013']){const visit=new Request(`${origin}/api/analytics`,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({event:'page_view',path:'/',visitorId,consent:true})});Object.defineProperty(visit,'cf',{value:{country:'IN',region:'Kerala',regionCode:'KL'}});expect((await recordBrowserAnalytics(visit)).status).toBe(200)}const dashboard=await getAdminDashboard(db);expect(dashboard.reports.funnel.pageViews).toBe(1);expect(dashboard.visitorLocations).toEqual([{country:'IN',state:'Kerala',stateCode:'KL',viewers:1}])})
  it('counts refreshes and page changes once per device but counts a new device',async()=>{for(const path of ['/','/','/about'])await recordBrowserAnalytics(request({event:'page_view',path,consent:true}));await recordBrowserAnalytics(request({event:'page_view',path:'/',consent:true,visitorId:'12345678-1234-1234-1234-123456789013'}));expect(await db.prepare("SELECT COUNT(*) total FROM first_party_analytics_events WHERE event_name='page_view'").first()).toMatchObject({total:2});expect(await db.prepare('SELECT COUNT(*) total FROM analytics_visitors').first()).toMatchObject({total:2})})
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
