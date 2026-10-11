import { createFileRoute } from '@tanstack/react-router'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'

const COOKIE='offscroll_poll_voter'
const voter=(request:Request)=>{const value=(request.headers.get('cookie')??'').split(';').map(item=>item.trim()).find(item=>item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);return value&&/^[a-f0-9-]{36}$/i.test(value)?value:null}
const cookie=(value:string)=>`${COOKIE}=${value}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
type Poll={id:string;question:string;option_one:string;option_two:string}

async function state(request:Request){const db=lifecycleBindings().db,poll=await db.prepare('SELECT id,question,option_one,option_two FROM homepage_poll WHERE id=? AND active=1').bind('homepage').first<Poll>();if(!poll)return {poll:null};const voterKey=voter(request),votes=await db.prepare('SELECT choice,COUNT(*) AS count FROM homepage_poll_votes WHERE poll_id=? GROUP BY choice').bind(poll.id).all<{choice:number;count:number}>(),one=votes.results.find(row=>row.choice===1)?.count??0,two=votes.results.find(row=>row.choice===2)?.count??0,total=one+two,existing=voterKey?await db.prepare('SELECT choice FROM homepage_poll_votes WHERE poll_id=? AND voter_key=?').bind(poll.id,voterKey).first<{choice:number}>():null;return {poll:{id:poll.id,question:poll.question,options:[{id:1,label:poll.option_one,votes:one,percentage:total?Math.round(one*100/total):0},{id:2,label:poll.option_two,votes:two,percentage:total?Math.round(two*100/total):0}],voted:existing?.choice??null,total}}
}

export async function getPoll(request:Request){try{return json(await state(request))}catch{return json({poll:null})}}
export async function vote(request:Request){if(!isSameOrigin(request))return json({error:'Forbidden.'},403);const body=await request.json().catch(()=>null) as {choice?:unknown}|null,choice=Number(body?.choice);if(choice!==1&&choice!==2)return json({error:'Choose one of the two options.'},422);try{const db=lifecycleBindings().db,poll=await db.prepare('SELECT id FROM homepage_poll WHERE id=? AND active=1').bind('homepage').first<{id:string}>();if(!poll)return json({error:'This poll is not available.'},404);const key=voter(request)??crypto.randomUUID();await db.prepare('INSERT OR IGNORE INTO homepage_poll_votes(id,poll_id,voter_key,choice,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),poll.id,key,choice,Date.now()).run();const response=json(await state(new Request(request.url,{headers:{Cookie:`${COOKIE}=${key}`}})));if(!voter(request))response.headers.set('Set-Cookie',cookie(key));return response}catch{return json({error:'Your vote could not be recorded. Please try again.'},503)}}

export const Route=createFileRoute('/api/poll')({server:{handlers:{GET:({request})=>getPoll(request),POST:({request})=>vote(request)}}})
