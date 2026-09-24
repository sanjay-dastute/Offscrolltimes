import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { base64url } from '#/lib/codec'

async function hash(value:string){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))}

export async function allowRequest(request:Request,bucket:string,limit:number,windowMs:number,identity?:string){
  let db:D1Database;try{db=lifecycleBindings().db}catch{return true}
  const forwarded=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
  const subject=await hash(`${bucket}:${identity||forwarded}`),now=Date.now(),windowStart=Math.floor(now/windowMs)*windowMs
  await db.prepare(`DELETE FROM security_rate_limits WHERE window_started_at < ?`).bind(now-2*windowMs).run()
  await db.prepare(`INSERT INTO security_rate_limits(bucket,subject_hash,window_started_at,request_count) VALUES(?,?,?,1)
    ON CONFLICT(bucket,subject_hash,window_started_at) DO UPDATE SET request_count=request_count+1`).bind(bucket,subject,windowStart).run()
  const row=await db.prepare(`SELECT request_count FROM security_rate_limits WHERE bucket=? AND subject_hash=? AND window_started_at=?`).bind(bucket,subject,windowStart).first<{request_count:number}>()
  return Number(row?.request_count??limit+1)<=limit
}
