import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { storeObject, type StoredCategory } from '#/lib/object-storage.server'

const MAX_ADMIN_FILE=25*1024*1024
const CATEGORIES=new Set<StoredCategory>(['edition_file','product_asset'])
const TYPES=new Set(['image/jpeg','image/png','image/webp','application/pdf'])
const SAFE_ID=/^[A-Za-z0-9_-]{1,160}$/

async function list(request:Request){
  const session=await readAdministratorSession(request);if(!session)return json({error:'Administrator access required.'},403)
  const rows=await lifecycleBindings().db.prepare(`SELECT id,category,related_type,related_id,original_name,content_type,size_bytes,visibility,created_at FROM object_storage_records WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 250`).all()
  return json({files:rows.results})
}

async function upload(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readAdministratorSession(request);if(!session)return json({error:'Administrator access required.'},403)
  if(request.headers.get('x-csrf-token')!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const category=request.headers.get('x-file-category') as StoredCategory,relatedId=request.headers.get('x-related-id')??'',contentType=(request.headers.get('content-type')??'').split(';')[0].toLowerCase(),size=Number(request.headers.get('content-length')??request.headers.get('x-file-size'))
  if(!CATEGORIES.has(category)||!SAFE_ID.test(relatedId)||!TYPES.has(contentType)||!Number.isSafeInteger(size)||size<1||size>MAX_ADMIN_FILE||!request.body)return json({error:'Upload an approved image or PDF up to 25 MB with a valid record reference.'},422)
  const id=await storeObject({category,relatedType:category==='edition_file'?'edition':'product',relatedId,originalName:request.headers.get('x-file-name')??'asset',contentType,size,createdBy:session.user.id,body:request.body,visibility:request.headers.get('x-publish')==='true'?'published':'private'})
  return json({ok:true,id},201)
}

export const Route=createFileRoute('/api/admin/files')({server:{handlers:{GET:({request})=>list(request),POST:({request})=>upload(request)}}})
