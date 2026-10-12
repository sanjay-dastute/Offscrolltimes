import { afterEach, beforeEach, expect, it } from 'vitest'
import { sessionCookie } from './auth.server'
import { createTestD1 } from './lifecycle/testing'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from './lifecycle/env.server'
import { saveHomepageVideo, deleteHomepageVideo } from '../routes/api.admin.video'
import { saveHomepageUpload } from '../routes/api.admin.uploads'
import { cleanupHomepageMedia, objectResponse } from './object-storage.server'
let db:D1Database,values:Map<string,Uint8Array>,bucket:R2Bucket,failDelete:boolean
beforeEach(()=>{
  process.env.SESSION_SECRET='homepage-media-test-session-secret-at-least-32-characters';process.env.ADMIN_IDENTITY_IDS='media_admin'
  db=createTestD1();values=new Map();failDelete=false
  bucket={async put(key:string,body:ReadableStream|ArrayBuffer|string){values.set(key,new Uint8Array(await new Response(body).arrayBuffer()));return null as never},async get(key:string,options?:R2GetOptions){const bytes=values.get(key);if(!bytes)return null;const range=options?.range instanceof Headers?options.range.get('range'):null;return {size:bytes.length,body:new Response(Uint8Array.from(range?bytes.slice(0,2):bytes).buffer).body!,range:range?{offset:0,length:2}:undefined} as R2ObjectBody},async delete(key:string){if(failDelete)throw Error('temporary storage failure');values.delete(key)}} as unknown as R2Bucket
  initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'homepage-media-test-lifecycle-secret-at-least-32-characters',OFFSCROLL_FILES:bucket})
})
afterEach(()=>{Reflect.deleteProperty(process.env,'ADMIN_IDENTITY_IDS');resetRequestLifecycleBindings()})
async function upload(path:string,name:string,type:string,position?:number){const cookie=await sessionCookie({accessToken:'',refreshToken:'',expiresAt:Date.now()+60000,user:{id:'media_admin'},csrf:'media-csrf'});return new Request(`https://example.com${path}`,{method:'POST',headers:{Origin:'https://example.com',Cookie:cookie,'Content-Type':type,'X-CSRF-Token':'media-csrf','X-File-Name':name,'X-File-Size':'4',...(position?{'X-Position':String(position)}:{})},body:new Uint8Array([1,2,3,4])})}
it('replaces video and removes previous bytes and metadata, with inline range playback',async()=>{
  expect((await saveHomepageVideo(await upload('/api/admin/video','first.mp4','video/mp4'))).status).toBe(200)
  const old=await db.prepare('SELECT asset_id FROM homepage_video').first<{asset_id:string}>()
  expect((await saveHomepageVideo(await upload('/api/admin/video','second.mp4','video/mp4'))).status).toBe(200)
  expect(await db.prepare('SELECT id FROM object_storage_records WHERE id=?').bind(old!.asset_id).first()).toBeNull();expect(values.size).toBe(1)
  const current=await db.prepare('SELECT asset_id FROM homepage_video').first<{asset_id:string}>()
  const response=await objectResponse(current!.asset_id,{},new Request('https://example.com/video',{headers:{Range:'bytes=0-1'}}))
  expect(response?.status).toBe(206);expect(response?.headers.get('content-range')).toBe('bytes 0-1/4');expect(response?.headers.get('content-disposition')).toContain('inline');expect((await response!.arrayBuffer()).byteLength).toBe(2)
})
it('replaces slide images and hard-deletes their prior metadata',async()=>{
  expect((await saveHomepageUpload(await upload('/api/admin/uploads','first.jpg','image/jpeg',1))).status).toBe(200)
  const old=await db.prepare('SELECT asset_id FROM homepage_uploads').first<{asset_id:string}>()
  expect((await saveHomepageUpload(await upload('/api/admin/uploads','second.jpg','image/jpeg',1))).status).toBe(200)
  expect(await db.prepare('SELECT id FROM object_storage_records WHERE id=?').bind(old!.asset_id).first()).toBeNull();expect(values.size).toBe(1)
})
it('keeps the new video when old-file deletion fails and retries cleanup',async()=>{
  await saveHomepageVideo(await upload('/api/admin/video','first.mp4','video/mp4'));failDelete=true
  expect((await saveHomepageVideo(await upload('/api/admin/video','second.mp4','video/mp4'))).status).toBe(200)
  expect(values.size).toBe(2);failDelete=false;await cleanupHomepageMedia(db,bucket)
  expect(values.size).toBe(1);expect(await db.prepare('SELECT COUNT(*) total FROM object_storage_records').first()).toMatchObject({total:1})
})
it('requires CSRF and deletes the current uploaded video on an authorised request',async()=>{
  const bad=await upload('/api/admin/video','first.mp4','video/mp4');bad.headers.set('X-CSRF-Token','wrong');expect((await saveHomepageVideo(bad)).status).toBe(403)
  await saveHomepageVideo(await upload('/api/admin/video','first.mp4','video/mp4'));const auth=await upload('/api/admin/video','unused.mp4','video/mp4')
  const request=new Request(auth.url,{method:'DELETE',headers:auth.headers,body:JSON.stringify({csrf:'media-csrf'})})
  expect((await deleteHomepageVideo(request)).status).toBe(200);expect(values.size).toBe(0);expect(await db.prepare('SELECT COUNT(*) total FROM object_storage_records').first()).toMatchObject({total:0})
})
