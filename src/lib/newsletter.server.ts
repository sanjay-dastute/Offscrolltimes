import { lifecycleBindings } from './lifecycle/env.server'
import { json } from './http.server'
import { isSameOrigin } from './security'
import { allowRequest } from './rate-limit.server'
import { readAdministratorSession } from './admin/auth.server'
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('')

export async function newsletterSignup(request:Request) {
 if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
 let body:Record<string,unknown>
 try{body=await request.json() as Record<string,unknown>;if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}catch{return json({error:'Invalid request.'},400)}
 try {
  const db=lifecycleBindings().db
  if(!await allowRequest(request,'newsletter_signup',10,3600000))return json({error:'Too many attempts. Please try again later.'},429)
  if(body.action==='unsubscribe') {
   if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return json({error:'Invalid signup management link.'},400)
   const result=await db.prepare(`UPDATE newsletter_subscribers SET status='unsubscribed',updated_at=? WHERE unsubscribe_token_hash=?`).bind(Date.now(),await hash(body.token)).run()
   return (result.meta.changes??0)>0?json({ok:true,message:'You have been unsubscribed.'}):json({error:'This signup management link is no longer valid.'},404)
  }
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||body.consent!==true||body.website)return json({error:'Enter a valid email address and agree to receive email updates.'},422)
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join(''),now=Date.now()
  await db.prepare(`INSERT INTO newsletter_subscribers(id,email,status,consent_at,consent_text,unsubscribe_token_hash,created_at,updated_at) VALUES(?,?,'subscribed',?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET status='subscribed',consent_at=excluded.consent_at,consent_text=excluded.consent_text,unsubscribe_token_hash=excluded.unsubscribe_token_hash,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),email,now,'I agree to receive Offscroll Times email updates. I can unsubscribe using my signup management link or contact support.',await hash(token),now,now).run()
  return json({ok:true,message:'You’re subscribed to Offscroll Times email updates.',manageUrl:`/newsletter/unsubscribe?token=${token}`})
 }catch{return json({error:'Email signup is temporarily unavailable. Please try again.'},503)}
}
export async function newsletterSubscribers(request:Request) {
 if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
 try {
  const db=lifecycleBindings().db,url=new URL(request.url),requested=Math.max(1,Math.floor(Number(url.searchParams.get('page'))||1))
  const count=await db.prepare('SELECT COUNT(*) total FROM newsletter_subscribers').first<{total:number}>()
  const total=Number(count?.total??0),pages=Math.max(1,Math.ceil(total/25)),page=Math.min(requested,pages)
  const rows=await db.prepare('SELECT id,email,status,consent_at,created_at FROM newsletter_subscribers ORDER BY created_at DESC,id LIMIT 25 OFFSET ?').bind((page-1)*25).all()
  return json({subscribers:rows.results,total,page,pages})
 }catch{return json({error:'Email subscribers could not be loaded.'},503)}
}
