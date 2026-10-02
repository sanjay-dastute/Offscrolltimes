import { beforeEach, describe, expect, it } from 'vitest'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { customerDirectory, updateCustomerContact } from './directory.server'

let db:D1Database
beforeEach(()=>{db=createTestD1();process.env.SESSION_SECRET='directory-test-secret-at-least-32-characters'})
async function user(index:number) {
  await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,primary_email,created_at,updated_at) VALUES(?,?,'customer','active',?,?,?)`).bind(`user_${index}`,`owner_${index}`,`reader${index}@example.com`,index,index).run()
}
describe('customer directory',()=>{
  it('keeps administrator identities out of the customer list',async()=>{
    await user(1)
    await db.prepare("INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at) VALUES('admin_user','admin:admin','admin','active',1,1)").run()
    const result=await customerDirectory(db,new URL('https://example.com/api/admin/customers'))
    expect(result.total).toBe(1)
    expect(result.customers[0].user_id).toBe('user_1')
  })
  it('includes registered users without orders and pages beyond 500 records without duplicates',async()=>{
    for(let index=0;index<526;index++)await user(index)
    const first=await customerDirectory(db,new URL('https://example.com/api/admin/customers'))
    const last=await customerDirectory(db,new URL('https://example.com/api/admin/customers?page=22'))
    expect(first.total).toBe(526);expect(first.customers).toHaveLength(25);expect(last.customers).toHaveLength(1)
    expect(last.customers[0]).toMatchObject({user_id:'user_0',subscription_count:0,payment_status:null})
    expect(first.customers.some(row=>row.user_id===last.customers[0].user_id)).toBe(false)
  })
  it('stores separate WhatsApp contact details and audits corrections without leaking contact values',async()=>{
    await user(1)
    expect(await updateCustomerContact(db,'admin_1',{userId:'user_1',name:'Reader One',email:'contact@example.com',phone:'+919999999999',whatsapp:'+918888888888',reason:'Customer requested correction'})).toBe(true)
    const result=await customerDirectory(db,new URL('https://example.com/api/admin/customers?query=88888888'))
    expect(result.customers[0]).toMatchObject({display_name:'Reader One',email:'contact@example.com',phone:'+919999999999',whatsapp_number:'+918888888888'})
    const audit=await db.prepare('SELECT summary_json FROM admin_audit_log').first<{summary_json:string}>()
    expect(audit?.summary_json).not.toContain('88888888')
    expect(await updateCustomerContact(db,'admin_1',{userId:'missing',name:'Missing',email:'missing@example.com',phone:'',whatsapp:'',reason:'Test correction'})).toBe(false)
  })
  it('treats search wildcards literally and clamps invalid pages',async()=>{
    await user(1)
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?query=%25'))).total).toBe(0)
    expect((await customerDirectory(db,new URL('https://example.com/api/admin/customers?page=-1'))).page).toBe(1)
  })
})
