import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { audit } from '#/lib/admin/store.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { retireObject, storeObject } from '#/lib/object-storage.server'

const MAX_IMAGE=10*1024*1024
const ID=/^[A-Za-z0-9-]{1,160}$/
const imageType=(value:string)=>['image/jpeg','image/png','image/webp'].includes(value)
const imageTypeFromName=(value:string)=>{const name=value.toLowerCase();return name.endsWith('.jpg')||name.endsWith('.jpeg')?'image/jpeg':name.endsWith('.png')?'image/png':name.endsWith('.webp')?'image/webp':''}

async function admin(request:Request){if(!isSameOrigin(request))return {error:json({error:'Forbidden.'},403)};const session=await readAdministratorSession(request);return session?{session}:{error:json({error:'Administrator access required.'},403)}}

export async function listHomepageUploads(request:Request){
  if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
  const rows=await lifecycleBindings().db.prepare(`SELECT h.id,h.position,h.asset_id,o.original_name,o.size_bytes FROM homepage_uploads h JOIN object_storage_records o ON o.id=h.asset_id WHERE o.deleted_at IS NULL ORDER BY h.position`).all()
  return json({uploads:rows.results})
}

export async function saveHomepageUpload(request:Request){
  const auth=await admin(request);if(auth.error)return auth.error
  const {session}=auth,position=Number(request.headers.get('x-position')),size=Number(request.headers.get('x-file-size')??request.headers.get('content-length')),fileName=request.headers.get('x-file-name')??`slideshow-${position}.jpg`,providedType=(request.headers.get('content-type')??'').split(';')[0].toLowerCase(),contentType=imageType(providedType)?providedType:imageTypeFromName(fileName)
  if(request.headers.get('x-csrf-token')!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  if(!Number.isInteger(position)||position<1||position>5||!imageType(contentType)||!Number.isSafeInteger(size)||size<1||size>MAX_IMAGE||!request.body)return json({error:'Upload a JPG, PNG or WebP image up to 10 MB into one of the five slideshow positions.'},422)
  const db=lifecycleBindings().db,existing=await db.prepare('SELECT id,asset_id FROM homepage_uploads WHERE position=?').bind(position).first<{id:string;asset_id:string}>(),id=existing?.id??crypto.randomUUID(),now=Date.now();let assetId=''
  try{assetId=await storeObject({category:'homepage_upload',relatedType:'homepage_upload',relatedId:id,originalName:fileName,contentType,size,createdBy:session.user.id,body:request.body,visibility:'published'});if(existing)await db.prepare('UPDATE homepage_uploads SET asset_id=?,updated_at=? WHERE id=?').bind(assetId,now,id).run();else await db.prepare('INSERT INTO homepage_uploads(id,asset_id,position,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,assetId,position,session.user.id,now,now).run();if(existing)await retireObject(existing.asset_id);await audit(db,session.user.id,'homepage_upload.saved','homepage_upload',id,{position,assetId});return json({ok:true})}catch(error){console.error(JSON.stringify({message:'homepage_upload_failed',position,error:error instanceof Error?error.message:'unknown'}));if(assetId)try{await retireObject(assetId)}catch{};return json({error:'Image upload could not be completed. Please try a JPG, PNG or WebP image under 10 MB.'},503)}}
export async function deleteHomepageUpload(request:Request){const auth=await admin(request);if(auth.error)return auth.error;const {session}=auth;const body=await request.json() as {csrf?:string;id?:string};if(body.csrf!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403);if(!body.id||!ID.test(body.id))return json({error:'Invalid image.'},422);const db=lifecycleBindings().db,row=await db.prepare('SELECT asset_id FROM homepage_uploads WHERE id=?').bind(body.id).first<{asset_id:string}>();if(!row)return json({error:'Image not found.'},404);await db.prepare('DELETE FROM homepage_uploads WHERE id=?').bind(body.id).run();await retireObject(row.asset_id);await audit(db,session.user.id,'homepage_upload.deleted','homepage_upload',body.id,{});return json({ok:true})}

export const Route=createFileRoute('/api/admin/uploads')({server:{handlers:{GET:({request})=>listHomepageUploads(request),POST:({request})=>saveHomepageUpload(request),DELETE:({request})=>deleteHomepageUpload(request)}}})
