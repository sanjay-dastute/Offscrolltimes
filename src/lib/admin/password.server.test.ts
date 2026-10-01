import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { pbkdf2Sync } from 'node:crypto'
import { createTestD1 } from '../lifecycle/testing'
import { initRequestLifecycleBindings,resetRequestLifecycleBindings } from '../lifecycle/env.server'
import { adminPasswordLogin,adminPasswordLogout,readPasswordAdministrator } from './password.server'
import { readAdministratorSession } from './auth.server'
import { getAdmin } from './endpoint.server'
const origin='https://offscrolltimes.com'
const password='Test-password-only-48291'
const salt='00112233445566778899aabbccddeeff'
const request=(body:unknown,requestOrigin=origin)=>new Request(`${origin}/api/admin/login`,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)})
beforeEach(()=>{
  vi.stubEnv('ADMIN_USERNAME','admin')
  vi.stubEnv('ADMIN_PASSWORD_HASH',`pbkdf2-sha256-100000$${salt}$${pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')}`)
  vi.stubEnv('SESSION_SECRET','admin-test-session-secret-at-least-32-characters')
  initRequestLifecycleBindings({LIFECYCLE_DB:createTestD1(),LIFECYCLE_SECRET:'admin-test-lifecycle-secret-at-least-32-characters'})
})
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();resetRequestLifecycleBindings()})
describe('administrator password login',()=>{
  it('authenticates independently of customer identity and loads the real admin dashboard',async()=>{
    const response=await adminPasswordLogin(request({username:'admin',password}))
    expect(response.status).toBe(200)
    const cookie=response.headers.get('Set-Cookie')!
    expect(cookie).toContain('HttpOnly; Secure; SameSite=Strict')
    expect(cookie).not.toContain(password)
    const authenticated=new Request(`${origin}/api/admin`,{headers:{Cookie:cookie.split(';')[0]}})
    const session=await readAdministratorSession(authenticated)
    expect(session?.user.id).toBe('admin:admin')
    expect((await getAdmin(authenticated)).status).toBe(200)
    expect((await adminPasswordLogout(new Request(`${origin}/api/admin/login`,{method:'DELETE',headers:{Origin:origin,Cookie:cookie.split(';')[0]},body:JSON.stringify({csrf:session!.csrf})}))).headers.get('Set-Cookie')).toContain('Max-Age=0')
  })
  it('rejects incorrect credentials, cross-origin requests, and excessive attempts',async()=>{
    expect((await adminPasswordLogin(request({username:'admin',password},'https://evil.invalid'))).status).toBe(403)
    for(let i=0;i<5;i++)expect((await adminPasswordLogin(request({username:'admin',password:'wrong'}))).status).toBe(401)
    expect((await adminPasswordLogin(request({username:'admin',password}))).status).toBe(429)
  })
  it('rejects tampered, expired, and password-rotation-invalidated sessions',async()=>{
    const response=await adminPasswordLogin(request({username:'admin',password}))
    const value=response.headers.get('Set-Cookie')!.split(';')[0]
    const authenticated=new Request(`${origin}/api/admin`,{headers:{Cookie:value}})
    expect(await readPasswordAdministrator(new Request(`${origin}/api/admin`,{headers:{Cookie:value+'x'}}))).toBeNull()
    vi.useFakeTimers();vi.setSystemTime(Date.now()+9*60*60*1000)
    expect(await readPasswordAdministrator(authenticated)).toBeNull()
    vi.useRealTimers();vi.stubEnv('ADMIN_PASSWORD_HASH','rotated')
    expect(await readPasswordAdministrator(authenticated)).toBeNull()
  })
})
