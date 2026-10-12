import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { audit } from '#/lib/admin/store.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { purgeHomepageObject, storeObject } from '#/lib/object-storage.server'

export async function getHomepageVideo(request:Request){
  if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
  const video=await lifecycleBindings().db.prepare('SELECT v.asset_id,o.original_name,o.size_bytes FROM homepage_video v JOIN object_storage_records o ON o.id=v.asset_id WHERE o.deleted_at IS NULL').first()
  return json({video})
}

export async function saveHomepageVideo(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readAdministratorSession(request)
  if(!session||request.headers.get('x-csrf-token')!==session.csrf)return json({error:'Refresh your administrator session and retry.'},403)
  const name=request.headers.get('x-file-name')??'homepage.mp4',size=Number(request.headers.get('x-file-size')??request.headers.get('content-length'))
  if(!name.toLowerCase().endsWith('.mp4')||!Number.isSafeInteger(size)||size<=0||size>50*1024*1024||!request.body)return json({error:'Choose an MP4 video up to 50 MB. Use H.264 for browser playback.'},422)
  const db=lifecycleBindings().db,existing=await db.prepare("SELECT asset_id FROM homepage_video WHERE id='homepage'").first<{asset_id:string}>()
  let assetId='',committed=false
  try{
    assetId=await storeObject({category:'homepage_upload',relatedType:'homepage_video',relatedId:'homepage',originalName:name,contentType:'video/mp4',size,createdBy:session.user.id,body:request.body,visibility:'published'})
    const now=Date.now()
    await db.prepare("INSERT INTO homepage_video(id,asset_id,created_by,created_at,updated_at) VALUES('homepage',?,?,?,?) ON CONFLICT(id) DO UPDATE SET asset_id=excluded.asset_id,updated_at=excluded.updated_at").bind(assetId,session.user.id,now,now).run()
    committed=true
    if(existing)await purgeHomepageObject(existing.asset_id)
    await audit(db,session.user.id,'homepage_video.saved','homepage_video','homepage',{assetId})
    return json({ok:true})
  }catch(error){
    console.error(JSON.stringify({message:'homepage_video_upload_failed',committed,error:error instanceof Error?error.message:'unknown'}))
    if(committed)return json({ok:true,message:'Video saved. Previous-file cleanup will retry automatically.'})
    if(assetId)try{await purgeHomepageObject(assetId)}catch{/* Cron retries retired media. */}
    return json({error:'Video upload could not be completed. Please retry.'},503)
  }
}

export async function deleteHomepageVideo(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readAdministratorSession(request),body=await request.json().catch(()=>null) as {csrf?:string}|null
  if(!session||body?.csrf!==session.csrf)return json({error:'Refresh your administrator session and retry.'},403)
  const db=lifecycleBindings().db,existing=await db.prepare("SELECT asset_id FROM homepage_video WHERE id='homepage'").first<{asset_id:string}>()
  await db.prepare("DELETE FROM homepage_video WHERE id='homepage'").run()
  if(existing)await purgeHomepageObject(existing.asset_id)
  await audit(db,session.user.id,'homepage_video.deleted','homepage_video','homepage',{})
  return json({ok:true})
}

export const Route=createFileRoute('/api/admin/video')({server:{handlers:{GET:({request})=>getHomepageVideo(request),POST:({request})=>saveHomepageVideo(request),DELETE:({request})=>deleteHomepageVideo(request)}}})
