import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { audit } from '#/lib/admin/store.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'

type PollBody={csrf?:unknown;question?:unknown;optionOne?:unknown;optionTwo?:unknown;active?:unknown}
const text=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max?value.trim():null

async function admin(request:Request){if(!isSameOrigin(request))return {error:json({error:'Forbidden.'},403)};const session=await readAdministratorSession(request);return session?{session}:{error:json({error:'Administrator access required.'},403)}}

export async function getHomepagePoll(request:Request){if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403);const poll=await lifecycleBindings().db.prepare('SELECT id,question,option_one,option_two,active,updated_at FROM homepage_poll WHERE id=?').bind('homepage').first();return json({poll})}

export async function saveHomepagePoll(request:Request){const auth=await admin(request);if(auth.error)return auth.error;const body=await request.json().catch(()=>null) as PollBody|null;if(!body||body.csrf!==auth.session.csrf)return json({error:'Your session changed. Refresh and retry.'},403);const question=text(body.question,240),optionOne=text(body.optionOne,80),optionTwo=text(body.optionTwo,80);if(!question||!optionOne||!optionTwo)return json({error:'Enter a question and both poll options.'},422);const now=Date.now(),active=body.active===false?0:1,db=lifecycleBindings().db,existing=await db.prepare('SELECT question,option_one,option_two FROM homepage_poll WHERE id=?').bind('homepage').first<{question:string;option_one:string;option_two:string}>();if(existing&&(existing.question!==question||existing.option_one!==optionOne||existing.option_two!==optionTwo))await db.prepare('DELETE FROM homepage_poll_votes WHERE poll_id=?').bind('homepage').run();await db.prepare(`INSERT INTO homepage_poll(id,question,option_one,option_two,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET question=excluded.question,option_one=excluded.option_one,option_two=excluded.option_two,active=excluded.active,updated_at=excluded.updated_at`).bind('homepage',question,optionOne,optionTwo,active,now,now).run();await audit(db,auth.session.user.id,'homepage_poll.saved','homepage_poll','homepage',{active,resetVotes:Boolean(existing&&(existing.question!==question||existing.option_one!==optionOne||existing.option_two!==optionTwo))});return json({ok:true})}

export async function deleteHomepagePoll(request:Request){const auth=await admin(request);if(auth.error)return auth.error;const body=await request.json().catch(()=>null) as PollBody|null;if(!body||body.csrf!==auth.session.csrf)return json({error:'Your session changed. Refresh and retry.'},403);const db=lifecycleBindings().db;await db.batch([db.prepare('DELETE FROM homepage_poll_votes WHERE poll_id=?').bind('homepage'),db.prepare('DELETE FROM homepage_poll WHERE id=?').bind('homepage')]);await audit(db,auth.session.user.id,'homepage_poll.deleted','homepage_poll','homepage',{});return json({ok:true})}

export const Route=createFileRoute('/api/admin/poll')({server:{handlers:{GET:({request})=>getHomepagePoll(request),PUT:({request})=>saveHomepagePoll(request),DELETE:({request})=>deleteHomepagePoll(request)}}})
