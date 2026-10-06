import { afterEach,beforeEach,describe,expect,it } from 'vitest'
import { sessionCookie,type SessionData } from '#/lib/auth.server'
import { initRequestLifecycleBindings,resetRequestLifecycleBindings } from '#/lib/lifecycle/env.server'
import { createTestD1 } from '#/lib/lifecycle/testing'
import { listPublicAnswerSheets } from '../routes/api.answers'
import { deleteAdminAnswerSheet, listAdminAnswerSheets,replaceAdminAnswerSheet,updateAdminAnswerSheet,uploadAdminAnswerSheet } from '../routes/api.admin.answers'
import { objectResponse } from './object-storage.server'

let db:D1Database
function fakeBucket(){
  const values=new Map<string,Uint8Array>()
  return {bucket:{
    async put(key:string,value:ReadableStream|ArrayBuffer|string){const bytes=typeof value==='string'?new TextEncoder().encode(value):value instanceof ReadableStream?new Uint8Array(await new Response(value).arrayBuffer()):new Uint8Array(value);values.set(key,bytes);return null as never},
    async get(key:string){const body=values.get(key);return body?{key,size:body.byteLength,etag:'test',body:new Response(body.buffer as ArrayBuffer).body!,writeHttpMetadata(){}} as unknown as R2ObjectBody:null},
    async delete(key:string){values.delete(key)},
  } as unknown as R2Bucket}
}
async function adminRequest(init:RequestInit={}){
  const session:SessionData={accessToken:'access',refreshToken:'refresh',expiresAt:Date.now()+60_000,user:{id:'admin_1'},csrf:'csrf-admin_1'}
  return new Request('https://example.com/api/admin/answers',{...init,headers:{Origin:'https://example.com',Cookie:await sessionCookie(session),...(init.headers??{})}})
}
beforeEach(()=>{process.env.SESSION_SECRET='answer-sheet-tests-session-secret-at-least-32-chars';process.env.ADMIN_IDENTITY_IDS='admin_1';db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'answer-sheet-tests-lifecycle-secret-at-least-32-chars',OFFSCROLL_FILES:fakeBucket().bucket})})
afterEach(()=>{Reflect.deleteProperty(process.env,'ADMIN_IDENTITY_IDS');resetRequestLifecycleBindings()})

describe('OFFLIMITS answer sheets',()=>{
  it('lets an administrator publish a PDF and lists a public downloadable answer sheet',async()=>{
    const pdf=new Uint8Array([37,80,68,70,45,49,46,55])
    const upload=await uploadAdminAnswerSheet(await adminRequest({method:'POST',headers:{'Content-Type':'application/pdf','X-CSRF-Token':'csrf-admin_1','X-Issue-Number':'1','X-Issue-Date':'2026-10-01','X-File-Name':'issue-1-answers.pdf','X-File-Size':String(pdf.byteLength)},body:pdf}))
    expect(upload.status).toBe(201)
    const body=await upload.json() as {assetId:string}
    const publicList=await (await listPublicAnswerSheets()).json() as {answers:Array<{issueNumber:string;issueDate:string;assetId:string}>}
    expect(publicList.answers).toEqual([{issueNumber:'1',issueDate:'2026-10-01',assetId:body.assetId}])
    expect((await objectResponse(body.assetId,{}) )?.status).toBe(200)
    expect((await listAdminAnswerSheets(await adminRequest())).status).toBe(200)
  })
  it('rejects non-PDFs, duplicate issue numbers, and anonymous uploads',async()=>{
    const request=(headers:Record<string,string>)=>adminRequest({method:'POST',headers,body:new Uint8Array([1,2])})
    expect((await uploadAdminAnswerSheet(await request({'Content-Type':'image/png','X-CSRF-Token':'csrf-admin_1','X-Issue-Number':'2','X-Issue-Date':'2026-10-01','X-File-Size':'2'}))).status).toBe(422)
    const headers={'Content-Type':'application/pdf','X-CSRF-Token':'csrf-admin_1','X-Issue-Number':'2','X-Issue-Date':'2026-10-01','X-File-Size':'2'}
    expect((await uploadAdminAnswerSheet(await request(headers))).status).toBe(201)
    expect((await uploadAdminAnswerSheet(await request(headers))).status).toBe(409)
    expect((await uploadAdminAnswerSheet(new Request('https://example.com/api/admin/answers',{method:'POST',headers:{Origin:'https://example.com'}}))).status).toBe(403)
  })
  it('allows an administrator to rename, replace, and delete an answer sheet',async()=>{
    const original=new Uint8Array([37,80,68,70,45,49]),replacement=new Uint8Array([37,80,68,70,45,50])
    const published=await uploadAdminAnswerSheet(await adminRequest({method:'POST',headers:{'Content-Type':'application/pdf','X-CSRF-Token':'csrf-admin_1','X-Issue-Number':'3','X-Issue-Date':'2026-10-03','X-File-Name':'original.pdf','X-File-Size':String(original.byteLength)},body:original}))
    const {id,assetId}=await published.json() as {id:string;assetId:string}
    expect((await updateAdminAnswerSheet(await adminRequest({method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:'csrf-admin_1',id,issueNumber:'Three',issueDate:'2026-10-04'})}))).status).toBe(200)
    const replaced=await replaceAdminAnswerSheet(await adminRequest({method:'PUT',headers:{'Content-Type':'application/pdf','X-CSRF-Token':'csrf-admin_1','X-Answer-Id':id,'X-File-Name':'replacement.pdf','X-File-Size':String(replacement.byteLength)},body:replacement}))
    expect(replaced.status).toBe(200)
    const replacementId=(await replaced.json() as {assetId:string}).assetId
    expect(replacementId).not.toBe(assetId)
    expect(await objectResponse(assetId,{})).toBeNull()
    expect((await listPublicAnswerSheets()).json()).resolves.toMatchObject({answers:[{issueNumber:'Three',issueDate:'2026-10-04',assetId:replacementId}]})
    expect((await deleteAdminAnswerSheet(await adminRequest({method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:'csrf-admin_1',id})}))).status).toBe(200)
    expect((await listPublicAnswerSheets()).json()).resolves.toMatchObject({answers:[]})
    expect(await objectResponse(replacementId,{})).toBeNull()
  })
})
