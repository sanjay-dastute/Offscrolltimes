import { base64url, fromBase64url } from '../codec'
import { lifecycleBindings } from '../lifecycle/env.server'
import { allowRequest } from '../rate-limit.server'
import { isSameOrigin } from '../security'
import { json } from '../http.server'
import type { SessionData } from '../auth.server'

const COOKIE='__Host-offscroll_admin'
const encoder=new TextEncoder()
const lifetime=8*60*60
const cookie=(value:string,age=lifetime)=>`${COOKIE}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`
export const passwordAdminConfigured=()=>Boolean(process.env.ADMIN_USERNAME&&process.env.ADMIN_PASSWORD_HASH)
const equal=(a:Uint8Array,b:Uint8Array)=>{let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a[i]??0)^(b[i]??0);return difference===0}
async function signingKey(){
  const secret=process.env.SESSION_SECRET
  if(!secret||secret.length<32)throw new Error('Admin session configuration unavailable')
  return crypto.subtle.importKey('raw',encoder.encode(`${secret}:admin:${process.env.ADMIN_PASSWORD_HASH}:${process.env.ADMIN_USERNAME}`),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])
}
async function verifyPassword(password:string){
  const [scheme,saltText,digestText]= (process.env.ADMIN_PASSWORD_HASH??'').split('$')
  if(scheme!=='pbkdf2-sha256-100000'||!/^[a-f0-9]{32}$/.test(saltText??'')||!/^[a-f0-9]{64}$/.test(digestText??''))throw new Error('Admin password configuration unavailable')
  const bytes=(hex:string)=>new Uint8Array(hex.match(/../g)!.map(value=>parseInt(value,16)))
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits'])
  const digest=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(saltText),iterations:100000},key,256))
  return equal(digest,bytes(digestText))
}
export async function readPasswordAdministrator(request:Request):Promise<SessionData|null>{
  if(!passwordAdminConfigured())return null
  const raw=(request.headers.get('cookie')??'').split(';').map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)
  if(!raw||raw.length>2048)return null
  try{
    const [payload,signature,...extra]=raw.split('.')
    if(extra.length||!payload||!signature||!await crypto.subtle.verify('HMAC',await signingKey(),fromBase64url(signature),encoder.encode(payload)))return null
    const session=JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as SessionData
    if(session.expiresAt<=Date.now()||session.user.id!==`admin:${process.env.ADMIN_USERNAME}`||!session.csrf)return null
    return session
  }catch{return null}
}
export async function adminPasswordLogin(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  try{
    if(!passwordAdminConfigured())return json({error:'Administrator login is not configured.'},503)
    lifecycleBindings() // Login attempts must never bypass persistence-backed throttling.
    if(!await allowRequest(request,'admin_password_login',5,15*60*1000)||!await allowRequest(request,'admin_password_account',30,15*60*1000,'administrator'))return json({error:'Too many attempts. Please try again in 15 minutes.'},429)
    let body:Record<string,unknown>
    try{body=await request.json();if(!body||typeof body!=='object')throw new Error()}catch{return json({error:'Invalid request.'},400)}
    if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length>256)return json({error:'Incorrect username or password.'},401)
    const valid=await verifyPassword(body.password)
    if(body.username!==process.env.ADMIN_USERNAME||!valid)return json({error:'Incorrect username or password.'},401)
    const session:SessionData={accessToken:'',refreshToken:'',expiresAt:Date.now()+lifetime*1000,user:{id:`admin:${process.env.ADMIN_USERNAME}`,name:'Administrator',username:process.env.ADMIN_USERNAME},csrf:base64url(crypto.getRandomValues(new Uint8Array(24)))}
    const payload=base64url(encoder.encode(JSON.stringify(session)))
    const signature=base64url(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(payload))))
    return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie(`${payload}.${signature}`)}})
  }catch{return json({error:'Administrator login is temporarily unavailable.'},503)}
}
export async function adminPasswordLogout(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readPasswordAdministrator(request)
  const body=await request.json().catch(()=>null) as {csrf?:unknown}|null
  if(!session||body?.csrf!==session.csrf)return json({error:'Forbidden.'},403)
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie('',0)}})
}
