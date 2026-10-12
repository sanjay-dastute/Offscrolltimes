import { beforeEach,afterEach,it,expect } from 'vitest'
import { createTestD1 } from './lifecycle/testing'
import { initRequestLifecycleBindings,resetRequestLifecycleBindings } from './lifecycle/env.server'
import { sessionCookie } from './auth.server'
import { saveHomepagePoll,getHomepagePoll } from '../routes/api.admin.poll'
import { getPoll,vote } from '../routes/api.poll'
import { createEdition,updateEdition,getAdminDashboard } from './admin/store.server'
import { registerCustomerCheckout,applyCustomerPaymentSucceeded } from './customer/store.server'
import { reserveSubscriptionInventory } from './inventory.server'
let db:D1Database
beforeEach(()=>{db=createTestD1();process.env.SESSION_SECRET='poll-inventory-tests-secret-at-least-32-characters';process.env.ADMIN_IDENTITY_IDS='test_admin';initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'poll-inventory-tests-secret-at-least-32-characters'})})
afterEach(()=>{Reflect.deleteProperty(process.env,'ADMIN_IDENTITY_IDS');resetRequestLifecycleBindings()})
async function save(body:Record<string,unknown>={}){const cookie=await sessionCookie({accessToken:'',refreshToken:'',expiresAt:Date.now()+60000,user:{id:'test_admin'},csrf:'test-csrf'});return saveHomepagePoll(new Request('https://example.com/api/admin/poll',{method:'PUT',headers:{Origin:'https://example.com',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({csrf:'test-csrf',question:'Choose one',optionOne:'A',optionTwo:'B',optionThree:'C',optionFour:'D',note:'Note line one\nNote line two',...body})}))}
it('supports four choices and a note, preserves counts for note changes and resets for a new question',async()=>{
  expect((await save()).status).toBe(200);const state=await (await getPoll(new Request('https://example.com/api/poll'))).json() as {poll:{revision:string;options:unknown[];note:string}};expect(state.poll.options).toHaveLength(4);expect(state.poll.note).toContain('Note line two');
  const cast=await vote(new Request('https://example.com/api/poll',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({choice:4,revision:state.poll.revision})}));expect(cast.status).toBe(200);
  expect(await db.prepare('SELECT COUNT(*) total FROM homepage_poll_votes').first()).toMatchObject({total:1});await save({note:'New note'});expect(await db.prepare('SELECT COUNT(*) total FROM homepage_poll_votes').first()).toMatchObject({total:1});
  const cookie=await sessionCookie({accessToken:'',refreshToken:'',expiresAt:Date.now()+60000,user:{id:'test_admin'},csrf:'test-csrf'});expect(await (await getHomepagePoll(new Request('https://example.com/api/admin/poll',{headers:{Cookie:cookie}}))).json()).toMatchObject({total:1,counts:[{choice:4,votes:1}]});
  await save({question:'New question'});expect(await db.prepare('SELECT COUNT(*) total FROM homepage_poll_votes').first()).toMatchObject({total:0});
  expect((await vote(new Request('https://example.com/api/poll',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({choice:1,revision:state.poll.revision})}))).status).toBe(409);
})
it('resets a newly created poll even if its wording is identical',async()=>{await save();await db.prepare("INSERT INTO homepage_poll_votes(id,poll_id,voter_key,choice,created_at) VALUES('v','homepage','test-voter',1,1)").run();await save({newPoll:true});expect(await db.prepare('SELECT COUNT(*) total FROM homepage_poll_votes').first()).toMatchObject({total:0});expect((await save({note:'one\ntwo\nthree'})).status).toBe(422)})
it('keeps per-edition totals, deducts bulk and marketing copies, and rejects overselling',async()=>{
  const paidAt=Date.parse('2027-01-25T01:00:00Z');await registerCustomerCheckout(db,{id:'inventory_term',userId:'inventory_owner',planId:'quarterly',planName:'3 months',durationMonths:3,quantity:2,currency:'INR',amountMinor:55500,now:paidAt});await applyCustomerPaymentSucceeded(db,{id:'inventory_term',payerUserId:'inventory_owner',paymentId:'pay_inventory',paidAt,now:paidAt});
  for(const [issueNumber,dispatch] of [[1,Date.parse('2027-01-25T10:00:00Z')],[20,Date.parse('2027-02-25T10:00:00Z')]])await createEdition(db,'admin',{label:'Edition '+issueNumber,issueNumber,dispatch,cutoff:dispatch-86400000,copiesAvailable:10});
  const insert=(id:string,kind:string,qty:number)=>db.prepare('INSERT INTO edition_inventory_entries(id,edition_id,kind,quantity,note,created_by,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,'edition_1',kind,qty,'Test entry','admin',paidAt).run();await insert('bulk','bulk_sale',3);await insert('marketing','marketing',4);
  expect(await db.prepare("SELECT copies_available,printed_copies FROM editions WHERE id='edition_1'").first()).toMatchObject({copies_available:1,printed_copies:10});await expect(insert('oversell','bulk_sale',2)).rejects.toThrow('Not enough');
  await reserveSubscriptionInventory(db,'inventory_term',paidAt,paidAt);expect(await db.prepare("SELECT copies_available FROM editions WHERE id='edition_20'").first()).toMatchObject({copies_available:8});
  await updateEdition(db,'admin','edition_1',{label:'Edition 1',issueNumber:1,dispatch:Date.parse('2027-01-25T10:00:00Z'),cutoff:Date.parse('2027-01-24T10:00:00Z'),copiesAvailable:20});const dashboard=await getAdminDashboard(db);expect(dashboard.editions).toHaveLength(2);expect(dashboard.editions.find((e:Record<string,unknown>)=>e.id==='edition_1')).toMatchObject({printed_copies:20,subscription_copies:2,bulk_copies:3,marketing_copies:4,copies_available:11});
})
