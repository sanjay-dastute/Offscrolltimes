import { createFileRoute } from '@tanstack/react-router'
import { readSession } from '#/lib/auth.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { storeObject } from '#/lib/object-storage.server'

const MAX_DAMAGE_FILE=5*1024*1024
const ALLOWED=new Set(['image/jpeg','image/png','image/webp','application/pdf'])
const SAFE_ID=/^[A-Za-z0-9_-]{6,160}$/

async function list(request:Request){
  const session=await readSession(request);if(!session)return json({error:'Sign in required.'},401)
  const db=lifecycleBindings().db
  const rows=await db.prepare(`SELECT id,category,related_id,original_name,content_type,size_bytes,created_at FROM object_storage_records WHERE owner_id=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`).bind(session.user.id).all()
  return json({files:rows.results})
}

async function upload(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readSession(request);if(!session)return json({error:'Sign in required.'},401)
  if(request.headers.get('x-csrf-token')!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const subscriptionId=request.headers.get('x-subscription-id')??'',contentType=(request.headers.get('content-type')??'').split(';')[0].toLowerCase(),size=Number(request.headers.get('content-length')??request.headers.get('x-file-size'))
  if(!SAFE_ID.test(subscriptionId)||!ALLOWED.has(contentType)||!Number.isSafeInteger(size)||size<1||size>MAX_DAMAGE_FILE||!request.body)return json({error:'Upload a JPG, PNG, WebP or PDF up to 5 MB.'},422)
  const db=lifecycleBindings().db
  const owned=await db.prepare(`SELECT id FROM customer_subscriptions WHERE id=? AND owner_id=?`).bind(subscriptionId,session.user.id).first()
  if(!owned)return json({error:'Subscription not found.'},404)
  const id=await storeObject({category:'damage_evidence',ownerId:session.user.id,relatedType:'subscription',relatedId:subscriptionId,originalName:request.headers.get('x-file-name')??'damage-evidence',contentType,size,createdBy:session.user.id,body:request.body})
  return json({ok:true,id},201)
}

export const Route=createFileRoute('/api/customer/files')({server:{handlers:{GET:({request})=>list(request),POST:({request})=>upload(request)}}})
