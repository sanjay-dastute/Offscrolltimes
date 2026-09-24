import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { audit } from '#/lib/admin/store.server'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from '#/lib/lifecycle/env.server'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { allowRequest } from '#/lib/rate-limit.server'

describe('security controls',()=>{
  let db:D1Database
  beforeEach(()=>{process.env.SESSION_SECRET='security-controls-test-secret-at-least-32-characters';db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'lifecycle-secret-at-least-32-characters'})})
  afterEach(()=>{Reflect.deleteProperty(process.env,'SESSION_SECRET');resetRequestLifecycleBindings()})

  it('enforces fixed-window request limits without storing the raw subject',async()=>{
    const request=new Request('https://example.com/oauth/start',{headers:{'CF-Connecting-IP':'203.0.113.10'}})
    expect(await allowRequest(request,'test',2,60_000)).toBe(true)
    expect(await allowRequest(request,'test',2,60_000)).toBe(true)
    expect(await allowRequest(request,'test',2,60_000)).toBe(false)
    const row=await db.prepare(`SELECT subject_hash FROM security_rate_limits WHERE bucket='test'`).first<{subject_hash:string}>()
    expect(row?.subject_hash).not.toContain('203.0.113.10')
  })

  it('chains administrator events and rejects mutation or deletion',async()=>{
    await audit(db,'admin_1','test.action','subscription','sub_1',{safe:'summary'})
    const row=await db.prepare(`SELECT previous_hash,event_hash FROM security_audit_chain`).first<{previous_hash:string;event_hash:string}>()
    expect(row?.previous_hash).toBe('GENESIS');expect(row?.event_hash.length).toBeGreaterThan(30)
    await expect(db.prepare(`UPDATE admin_audit_log SET action='tampered'`).run()).rejects.toThrow(/append-only/)
    await expect(db.prepare(`DELETE FROM security_audit_chain`).run()).rejects.toThrow(/append-only/)
  })
})
