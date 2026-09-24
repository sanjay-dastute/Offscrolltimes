import { beforeEach,describe,expect,it } from 'vitest'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { initRequestLifecycleBindings,resetRequestLifecycleBindings } from '#/lib/lifecycle/env.server'
import { healthResponse,recordOperationalHealth } from './health.server'

describe('deployment health and alerts',()=>{
  beforeEach(()=>{const db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'health-test-secret-at-least-32-characters'})})
  it('serves a minimal liveness response without infrastructure details',async()=>{
    const response=await healthResponse(false)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({status:'ok',service:'offscroll-times'})
  })
  it('fails readiness closed when production provider credentials are absent',async()=>{
    const response=await healthResponse(true),body=await response.json() as Record<string,unknown>
    expect(response.status).toBe(503)
    expect(body.status).toBe('not_ready')
    expect(JSON.stringify(body)).not.toContain('secret-at-least')
  })
  it('records healthy runs and creates an alert for recent operational failure counts',async()=>{
    const db=(await import('#/lib/lifecycle/env.server')).lifecycleBindings().db,now=Date.now()
    expect(await recordOperationalHealth(db)).toMatchObject({status:'healthy'})
    await db.prepare(`INSERT INTO razorpay_webhook_receipts(event_id,event_type,received_at) VALUES('evt_delayed','payment.failed',?)`).bind(now-600000).run()
    expect(await recordOperationalHealth(db)).toMatchObject({status:'degraded',unprocessedWebhooks:1})
    expect(await db.prepare(`SELECT severity,status FROM operational_alerts`).first()).toMatchObject({severity:'critical',status:'open'})
    resetRequestLifecycleBindings()
  })
})
