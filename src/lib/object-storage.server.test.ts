import { afterEach,describe,expect,it } from 'vitest'
import { createTestD1 } from './lifecycle/testing'
import { initRequestLifecycleBindings,resetRequestLifecycleBindings } from './lifecycle/env.server'
import { objectResponse,storeObject } from './object-storage.server'

function fakeBucket(){
  const values=new Map<string,{body:Uint8Array;type:string}>()
  return {bucket:{
    async put(key:string,value:ReadableStream|ArrayBuffer|string,options?:R2PutOptions){let body:Uint8Array;if(typeof value==='string')body=new TextEncoder().encode(value);else if(value instanceof ReadableStream)body=new Uint8Array(await new Response(value).arrayBuffer());else body=new Uint8Array(value);const metadata=options?.httpMetadata;values.set(key,{body,type:metadata&&!(metadata instanceof Headers)?metadata.contentType??'application/octet-stream':'application/octet-stream'});return null as never},
    async get(key:string){const value=values.get(key);if(!value)return null;return {key,size:value.body.byteLength,etag:'test',body:new Response(value.body.buffer as ArrayBuffer).body!,writeHttpMetadata(){},httpMetadata:{contentType:value.type}} as unknown as R2ObjectBody},
    async delete(key:string){values.delete(key)},
  } as unknown as R2Bucket}
}

afterEach(()=>resetRequestLifecycleBindings())
describe('private object storage',()=>{
  it('stores metadata and enforces owner access',async()=>{const db=createTestD1(),fake=fakeBucket();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'storage-test-secret-at-least-32-characters',OFFSCROLL_FILES:fake.bucket});const id=await storeObject({category:'damage_evidence',ownerId:'owner_1',relatedType:'subscription',relatedId:'sub_1',originalName:'damage photo.jpg',contentType:'image/jpeg',size:3,createdBy:'owner_1',body:new Uint8Array([1,2,3]).buffer});expect(await objectResponse(id,{ownerId:'owner_2'})).toBeNull();const response=await objectResponse(id,{ownerId:'owner_1'});expect(response?.status).toBe(200);expect((await response?.arrayBuffer())?.byteLength).toBe(3)})
})
