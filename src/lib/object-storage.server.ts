import { lifecycleBindings } from './lifecycle/env.server'

export type StoredCategory='damage_evidence'|'receipt'|'edition_file'|'product_asset'|'dispatch_export'
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

export async function objectResponse(id:string,actor:{ownerId?:string;admin?:boolean}){
  const {db,bucket}=storageBindings()
  const row=await db.prepare(`SELECT object_key,owner_id,original_name,content_type,visibility FROM object_storage_records WHERE id=? AND deleted_at IS NULL`).bind(id).first<{object_key:string;owner_id:string|null;original_name:string;content_type:string;visibility:string}>()
  if(!row||!(actor.admin||row.visibility==='published'||(actor.ownerId&&row.owner_id===actor.ownerId)))return null
  const object=await bucket.get(row.object_key);if(!object)return null
  const headers=new Headers({'Content-Type':row.content_type,'Content-Disposition':`attachment; filename="${safeFileName(row.original_name)}"`,'Cache-Control':row.visibility==='published'?'public, max-age=3600':'private, no-store','X-Content-Type-Options':'nosniff'})
  return new Response(object.body,{headers})
}
