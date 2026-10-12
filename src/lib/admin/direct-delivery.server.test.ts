import { expect,it } from 'vitest'
import { createTestD1 } from '../lifecycle/testing'
import { dispatchRows } from './store.server'
import { registerCustomerCheckout,saveCustomerCheckoutDetails,applyCustomerPaymentSucceeded } from '../customer/store.server'
it('prints a draft edition directly using the dispatch-month 26th without fulfilment rows or stock changes',async()=>{
  const db=createTestD1(),paidAt=Date.parse('2026-10-12T10:00:00Z'),dispatch=Date.parse('2026-11-25T04:30:00Z')
  await db.prepare("INSERT INTO editions(id,label,issue_number,eligibility_cutoff_at,dispatch_at,copies_available,printed_copies,status,created_at,updated_at) VALUES('direct_edition','December issue',1,?,?,100,100,'draft',?,?)").bind(dispatch-86400000,dispatch,paidAt,paidAt).run()
  for(const [id,status,starts,end,address] of [
    ['eligible','active','2026-11-24T18:30:00Z','2026-12-24T18:30:00Z',true],
    ['expired','active','2026-10-24T18:30:00Z','2026-11-24T18:30:00Z',true],
    ['future','active','2026-12-24T18:30:00Z','2027-01-24T18:30:00Z',true],
    ['refunded','refunded','2026-11-24T18:30:00Z','2026-12-24T18:30:00Z',true],
    ['incomplete','active','2026-11-24T18:30:00Z','2026-12-24T18:30:00Z',false],
    ['unpaid','upcoming','2026-11-24T18:30:00Z','2026-12-24T18:30:00Z',true],
  ] as const){
    await registerCustomerCheckout(db,{id,userId:id,planId:'monthly',planName:'Monthly',durationMonths:1,quantity:1,currency:'INR',amountMinor:19900,now:paidAt})
    if(address)await saveCustomerCheckoutDetails(db,{id,userId:id,email:id+'@example.com',address:{name:id,line1:'1 Test Road',city:'Pune',postalCode:'411001',country:'IN'},now:paidAt})
    if(id!=='unpaid')await applyCustomerPaymentSucceeded(db,{id,payerUserId:id,paymentId:'pay_'+id,paidAt,now:paidAt})
    await db.prepare('UPDATE customer_subscriptions SET status=?,starts_at=?,paid_through_at=? WHERE id=?').bind(status,Date.parse(starts),Date.parse(end),id).run()
  }
  const before=await db.prepare("SELECT copies_available FROM editions WHERE id='direct_edition'").first()
  const rows=await dispatchRows(db,'direct_edition')
  expect(rows?.map(row=>row.address?.name)).toEqual(['eligible'])
  expect(await db.prepare("SELECT copies_available FROM editions WHERE id='direct_edition'").first()).toEqual(before)
  expect(await db.prepare('SELECT COUNT(*) total FROM customer_fulfilments').first()).toMatchObject({total:0})
  expect(await db.prepare('SELECT COUNT(*) total FROM edition_eligibility_snapshots').first()).toMatchObject({total:0})
  expect(await dispatchRows(db,'missing')).toBeNull()
})
