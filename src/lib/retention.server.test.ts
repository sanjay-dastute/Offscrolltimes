import {describe,expect,it} from 'vitest'
import {createTestD1} from './lifecycle/testing'
import {runRetentionCleanup} from './retention.server'

describe('retention cleanup',()=>{
  it('removes stale auth records and anonymises old resolved enquiries',async()=>{const db=createTestD1(),now=Date.now(),old=now-800*86400000
    await db.prepare(`INSERT INTO oauth_transactions(id,provider,state_hash,nonce_hash,pkce_challenge,mode,return_to,expires_at,created_at) VALUES('oauth','google','state','nonce','pkce','login','/account',?,?)`).bind(old,old).run()
    await db.prepare(`INSERT INTO contact_enquiries(id,reference,enquiry_type,name,email,message,status,staff_notes,email_sent,created_at,updated_at) VALUES('enquiry','REF','general','Personal Name','person@example.com','Private message','resolved','Private note',0,?,?)`).bind(old,old).run()
    const result=await runRetentionCleanup(db,now);expect(result.oauthTransactions).toBe(1);expect(result.enquiriesAnonymised).toBe(1)
    expect(await db.prepare(`SELECT name,email,message,staff_notes FROM contact_enquiries WHERE id='enquiry'`).first()).toMatchObject({name:'Removed',email:'removed@invalid.local',message:'Removed under retention policy',staff_notes:''})
  })
})
