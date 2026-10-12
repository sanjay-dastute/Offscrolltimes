import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { audit } from '#/lib/admin/store.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'

type PollBody={csrf?:unknown;question?:unknown;optionOne?:unknown;optionTwo?:unknown;optionThree?:unknown;optionFour?:unknown;note?:unknown;active?:unknown;newPoll?:unknown}
const text=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max?value.trim():null
async function admin(request:Request){if(!isSameOrigin(request))return {error:json({error:'Forbidden.'},403)};const session=await readAdministratorSession(request);return session?{session}:{error:json({error:'Administrator access required.'},403)}}
export async function getHomepagePoll(request:Request){
  if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
  const db=lifecycleBindings().db,poll=await db.prepare("SELECT * FROM homepage_poll WHERE id='homepage'").first()
  const counts=await db.prepare("SELECT choice,COUNT(*) votes FROM homepage_poll_votes WHERE poll_id='homepage' GROUP BY choice").all<{choice:number;votes:number}>()
  return json({poll,counts:counts.results,total:counts.results.reduce((sum,row)=>sum+row.votes,0)})
}
export async function saveHomepagePoll(request:Request){
  const auth=await admin(request);if(auth.error)return auth.error
  const body=await request.json().catch(()=>null) as PollBody|null
  if(!body||body.csrf!==auth.session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const question=text(body.question,240),options=[body.optionOne,body.optionTwo,body.optionThree,body.optionFour].map(value=>typeof value==='string'?value.trim():''),note=typeof body.note==='string'?body.note.trim():''
  if(!question||options.some(value=>value.length>80)||note.length>500||note.split(/\r?\n/).length>2)return json({error:'Enter a question. Options are optional (80 characters each); the optional note supports up to two lines and 500 characters.'},422)
  const db=lifecycleBindings().db,existing=await db.prepare("SELECT question,option_one,option_two,option_three,option_four,revision FROM homepage_poll WHERE id='homepage'").first<{question:string;option_one:string;option_two:string;option_three:string|null;option_four:string|null;revision:string}>()
  const reset=body.newPoll===true||!existing||existing.question!==question||[existing.option_one,existing.option_two,existing.option_three,existing.option_four].some((value,index)=>(value??'')!==options[index])
  const now=Date.now(),revision=reset?crypto.randomUUID():existing!.revision
  await db.batch([
    ...(reset?[db.prepare("DELETE FROM homepage_poll_votes WHERE poll_id='homepage'")]:[]),
    db.prepare("INSERT INTO homepage_poll(id,question,option_one,option_two,option_three,option_four,note,active,revision,created_at,updated_at) VALUES('homepage',?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET question=excluded.question,option_one=excluded.option_one,option_two=excluded.option_two,option_three=excluded.option_three,option_four=excluded.option_four,note=excluded.note,active=excluded.active,revision=excluded.revision,updated_at=excluded.updated_at").bind(question,...options,note,body.active===false?0:1,revision,now,now),
  ])
  await audit(db,auth.session.user.id,'homepage_poll.saved','homepage_poll','homepage',{resetVotes:reset,active:body.active!==false})
  return json({ok:true})
}
export async function deleteHomepagePoll(request:Request){const auth=await admin(request);if(auth.error)return auth.error;const body=await request.json().catch(()=>null) as PollBody|null;if(!body||body.csrf!==auth.session.csrf)return json({error:'Your session changed. Refresh and retry.'},403);const db=lifecycleBindings().db;await db.batch([db.prepare("DELETE FROM homepage_poll_votes WHERE poll_id='homepage'"),db.prepare("DELETE FROM homepage_poll WHERE id='homepage'")]);await audit(db,auth.session.user.id,'homepage_poll.deleted','homepage_poll','homepage',{});return json({ok:true})}
export const Route=createFileRoute('/api/admin/poll')({server:{handlers:{GET:({request})=>getHomepagePoll(request),PUT:({request})=>saveHomepagePoll(request),DELETE:({request})=>deleteHomepagePoll(request)}}})
