import { afterEach, describe, expect, it } from 'vitest'
import { initRequestLifecycleBindings, lifecycleBindings, lifecycleBindingsFromEnv, resetRequestLifecycleBindings } from './env.server'
import { createTestD1 } from './testing'

afterEach(()=>resetRequestLifecycleBindings())

describe('Cloudflare application bindings',()=>{
  it('resolves an explicit D1 binding and application encryption secret',()=>{
    const db=createTestD1()
    const bindings=lifecycleBindingsFromEnv({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'explicit-worker-secret-at-least-32-characters'})
    expect(bindings.db).toBe(db)
    expect(bindings.lifecycleSecret).toContain('explicit-worker')
  })

  it('rejects missing or weak persistence configuration',()=>{
    expect(()=>lifecycleBindingsFromEnv({})).toThrow()
    expect(()=>lifecycleBindingsFromEnv({LIFECYCLE_DB:createTestD1(),LIFECYCLE_SECRET:'too-short'})).toThrow()
  })

  it('initializes request bindings and clears stale bindings on invalid input',()=>{
    const db=createTestD1()
    initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'request-worker-secret-at-least-32-characters'})
    expect(lifecycleBindings().db).toBe(db)
    initRequestLifecycleBindings({})
    expect(()=>lifecycleBindings()).toThrow()
  })
})
