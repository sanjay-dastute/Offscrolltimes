import { lifecycleBindings } from './lifecycle/env.server'

export type StoredCategory='damage_evidence'|'receipt'|'edition_file'|'product_asset'|'dispatch_export'|'answer_sheet'|'homepage_upload'
const SAFE_NAME=/[^A-Za-z0-9._-]+/g

export function storageBindings(){
  const bindings=lifecycleBindings()
  if(!bindings.files)throw new Error('Private file storage is unavailable.')
  return {db:bindings.db,bucket:bindings.files}
}

export function safeFileName(value:string){return value.trim().slice(0,160).replace(SAFE_NAME,'-').replace(/^-+|-+$/g,'')||'file'}

export async function storeObject(input:{category:StoredCategory;ownerId?:string|null;relatedType:string;relatedId:string;originalName:string;contentType:string;size:number;createdBy:string;body:ReadableStream|ArrayBuffer|string;visibility?:'private'|'published'}){
  const {db,bucket}=storageBindings(),id=crypto.randomUUID(),name=safeFileName(input.originalName)
  const key=`${input.category}/${input.relatedId}/${id}-${name}`
  await bucket.put(key,input.body,{httpMetadata:{contentType:input.contentType,contentDisposition:`attachment; filename="${name}"`},customMetadata:{recordId:id,category:input.category}})
  try{
    await db.prepare(`INSERT INTO object_storage_records(id,object_key,category,owner_id,related_type,related_id,original_name,content_type,size_bytes,visibility,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,key,input.category,input.ownerId??null,input.relatedType,input.relatedId,name,input.contentType,input.size,input.visibility??'private',input.createdBy,Date.now()).run()
  }catch(error){await bucket.delete(key);throw error}
  return id
}

/** Retire metadata before deleting the bucket object so a published file is
 * immediately inaccessible even if the bucket operation later fails. */
export async function retireObject(id:string){
  const {db,bucket}=storageBindings()
  const record=await db.prepare(`SELECT object_key FROM object_storage_records WHERE id=? AND deleted_at IS NULL`).bind(id).first<{object_key:string}>()
  if(!record)return false
  await db.prepare(`UPDATE object_storage_records SET deleted_at=? WHERE id=? AND deleted_at IS NULL`).bind(Date.now(),id).run()
  await bucket.delete(record.object_key)
  return true
}

/** Homepage media is replaceable content; remove both bytes and metadata. */
export async function purgeHomepageObject(id:string){
  const {db,bucket}=storageBindings()
  const row=await db.prepare("SELECT object_key FROM object_storage_records WHERE id=? AND category='homepage_upload' AND NOT EXISTS(SELECT 1 FROM homepage_uploads WHERE asset_id=?) AND NOT EXISTS(SELECT 1 FROM homepage_video WHERE asset_id=?)").bind(id,id,id).first<{object_key:string}>()
  if(!row)return false
  await db.prepare('UPDATE object_storage_records SET deleted_at=? WHERE id=?').bind(Date.now(),id).run()
  await bucket.delete(row.object_key)
  await db.prepare("DELETE FROM object_storage_records WHERE id=? AND category='homepage_upload'").bind(id).run()
  return true
}

/** Retry retired media cleanup from cron if a previous storage delete failed. */
export async function cleanupHomepageMedia(db:D1Database,bucket:R2Bucket){
  const rows=await db.prepare("SELECT id,object_key FROM object_storage_records WHERE category='homepage_upload' AND deleted_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM homepage_uploads WHERE asset_id=object_storage_records.id) AND NOT EXISTS(SELECT 1 FROM homepage_video WHERE asset_id=object_storage_records.id) LIMIT 20").all<{id:string;object_key:string}>()
  for(const row of rows.results){await bucket.delete(row.object_key);await db.prepare("DELETE FROM object_storage_records WHERE id=? AND category='homepage_upload' AND deleted_at IS NOT NULL").bind(row.id).run()}
}

export async function objectResponse(id:string,actor:{ownerId?:string;admin?:boolean},request?:Request){
  const {db,bucket}=storageBindings()
  const row=await db.prepare(`SELECT object_key,owner_id,original_name,content_type,visibility FROM object_storage_records WHERE id=? AND deleted_at IS NULL`).bind(id).first<{object_key:string;owner_id:string|null;original_name:string;content_type:string;visibility:string}>()
  if(!row||!(actor.admin||row.visibility==='published'||(actor.ownerId&&row.owner_id===actor.ownerId)))return null
  const range=request?.headers.get('range')
  const object=await bucket.get(row.object_key,range?{range:request!.headers}:undefined);if(!object)return null
  const disposition=row.visibility==='published'&&(row.content_type.startsWith('image/')||row.content_type.startsWith('video/'))?'inline':'attachment'
  const headers=new Headers({'Content-Type':row.content_type,'Content-Disposition':`${disposition}; filename="${safeFileName(row.original_name)}"`,'Cache-Control':row.visibility==='published'?'public, max-age=3600':'private, no-store','X-Content-Type-Options':'nosniff'})
  headers.set('Accept-Ranges','bytes')
  const returnedRange=object.range
  if(range&&returnedRange&&'offset' in returnedRange&&'length' in returnedRange&&returnedRange.offset!==undefined&&returnedRange.length!==undefined){
    headers.set('Content-Range',`bytes ${returnedRange.offset}-${returnedRange.offset+returnedRange.length-1}/${object.size}`)
    headers.set('Content-Length',String(returnedRange.length))
    return new Response(object.body,{status:206,headers})
  }
  headers.set('Content-Length',String(object.size))
  return new Response(object.body,{headers})
}
