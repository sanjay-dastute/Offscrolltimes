import { createFileRoute } from '@tanstack/react-router'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
const COOKIE='offscroll_poll_voter'
const voter=(request:Request)=>{const value=(request.headers.get('cookie')??'').split(';').map(item=>item.trim()).find(item=>item.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return value&&/^[a-f0-9-]{36}$/i.test(value)?value:null}
const cookie=(value:string)=>COOKIE+'='+value+'; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax'
type Poll={id:string;question:string;option_one:string;option_two:string;option_three:string|null;option_four:string|null;note:string;revision:string}
async function state(request:Request){
  const db=lifecycleBindings().db,poll=await db.prepare("SELECT * FROM homepage_poll WHERE id='homepage' AND active=1").first<Poll>();if(!poll)return {poll:null}
  const key=voter(request),counts=await db.prepare("SELECT choice,COUNT(*) votes FROM homepage_poll_votes WHERE poll_id='homepage' GROUP BY choice").all<{choice:number;votes:number}>(),total=counts.results.reduce((sum,row)=>sum+row.votes,0)
  const existing=key?await db.prepare("SELECT choice FROM homepage_poll_votes WHERE poll_id='homepage' AND voter_key=?").bind(key).first<{choice:number}>():null
  const options=[poll.option_one,poll.option_two,poll.option_three,poll.option_four].map((label,index)=>({id:index+1,label:label??'',votes:counts.results.find(row=>row.choice===index+1)?.votes??0})).filter(option=>option.label)
  return {poll:{id:poll.id,question:poll.question,note:poll.note,revision:poll.revision,options:options.map(option=>({...option,percentage:total?Math.round(option.votes*100/total):0})),voted:existing?.choice??null,total}}
}
export async function getPoll(request:Request){try{return json(await state(request))}catch{return json({poll:null})}}
export async function vote(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const body=await request.json().catch(()=>null) as {choice?:unknown;revision?:unknown}|null,choice=Number(body?.choice)
  if(!Number.isInteger(choice)||choice<1||choice>4)return json({error:'Choose a poll option.'},422)
  const db=lifecycleBindings().db,poll=await db.prepare("SELECT * FROM homepage_poll WHERE id='homepage' AND active=1").first<Poll>()
  if(!poll)return json({error:'This poll is not available.'},404)
  if(body?.revision!==poll.revision)return json({error:'The question has changed. Refresh the page before voting.'},409)
  if(![poll.option_one,poll.option_two,poll.option_three,poll.option_four][choice-1])return json({error:'This option is not available.'},422)
  const key=voter(request)??crypto.randomUUID()
  await db.prepare("INSERT OR IGNORE INTO homepage_poll_votes(id,poll_id,voter_key,choice,created_at) SELECT ?,'homepage',?,?,? FROM homepage_poll WHERE id='homepage' AND revision=? AND active=1").bind(crypto.randomUUID(),key,choice,Date.now(),poll.revision).run()
  const response=json(await state(new Request(request.url,{headers:{Cookie:COOKIE+'='+key}})));if(!voter(request))response.headers.set('Set-Cookie',cookie(key));return response
}
export const Route=createFileRoute('/api/poll')({server:{handlers:{GET:({request})=>getPoll(request),POST:({request})=>vote(request)}}})
