import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { createTestD1 } from '../lifecycle/testing'
import { initRequestLifecycleBindings,resetRequestLifecycleBindings } from '../lifecycle/env.server'
import { sessionCookie } from '../auth.server'
import { ADMIN_EXPORTS } from '#/content/admin-exports'
import { downloadAdminExport,exportCsvCell } from './exports.server'
const origin='https://offscrolltimes.com'
let db:D1Database, cookie:string
beforeEach(async()=>{
  vi.stubEnv('ADMIN_USERNAME','');vi.stubEnv('ADMIN_PASSWORD_HASH','');vi.stubEnv('ADMIN_IDENTITY_IDS','export_admin');vi.stubEnv('SESSION_SECRET','test-export-session-secret-at-least-32-characters')
  db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'test-export-lifecycle-secret-at-least-32-characters'})
  cookie=(await sessionCookie({user:{id:'export_admin'},csrf:'export-csrf',accessToken:'',refreshToken:'',expiresAt:Date.now()+60000})).split(';')[0]
})
afterEach(()=>{vi.unstubAllEnvs();resetRequestLifecycleBindings()})
const request=(dataset:string,format='csv',csrf='export-csrf')=>new Request(`${origin}/api/admin/export`,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({dataset,format,csrf})})
describe('separate admin data exports',()=>{
  it('exports every configured category including empty CSV headers and audits each download',async()=>{
    for(const [key] of ADMIN_EXPORTS){const response=await downloadAdminExport(request(key));expect(response.status,key).toBe(200);expect(response.headers.get('Content-Disposition')).toContain(`${key}-`);expect((await response.text()).length).toBeGreaterThan(3)}
    expect(await db.prepare("SELECT COUNT(*) total FROM admin_audit_log WHERE action='data.exported'").first()).toEqual({total:ADMIN_EXPORTS.length})
  })
  it('includes all records beyond the dashboard page size and excludes unsubscribe secrets',async()=>{
    for(let i=0;i<30;i++)await db.prepare("INSERT INTO newsletter_subscribers VALUES(?,?,'subscribed',1,'consent','private-token-hash',1,1)").bind(`signup_${i}`,`reader${i}@example.com`).run()
    const response=await downloadAdminExport(request('newsletter','json'))
    const text=await response.text();expect(JSON.parse(text)).toHaveLength(30);expect(text).not.toContain('private-token-hash');expect(text).not.toContain('unsubscribe_token_hash')
  })
  it('requires administrator authentication, same origin, CSRF and a known category',async()=>{
    expect((await downloadAdminExport(new Request(`${origin}/api/admin/export`,{method:'POST',headers:{Origin:origin},body:'{}'}))).status).toBe(403)
    expect((await downloadAdminExport(request('customers','csv','wrong'))).status).toBe(403)
    expect((await downloadAdminExport(request('application_sessions'))).status).toBe(422)
    expect((await downloadAdminExport(request('customers','sql'))).status).toBe(422)
    expect((await downloadAdminExport(new Request(`${origin}/api/admin/export`,{method:'POST',headers:{Origin:'https://evil.invalid',Cookie:cookie},body:'{}'}))).status).toBe(403)
  })
  it('escapes spreadsheet formulas, quotes, commas and newlines',()=>{
    expect(exportCsvCell(' =HYPERLINK("evil")')).toBe('"\' =HYPERLINK(""evil"")"')
    expect(exportCsvCell('a,b\n"c"')).toBe('"a,b\n""c"""')
    expect(exportCsvCell(null)).toBe('""')
  })
})
