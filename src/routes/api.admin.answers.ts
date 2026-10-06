import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { retireObject, storeObject } from '#/lib/object-storage.server'
import { audit } from '#/lib/admin/store.server'

const MAX_ANSWER_PDF=25*1024*1024
const PDF='application/pdf'
const ISSUE_NUMBER=/^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/
const DATE=/^\d{4}-\d{2}-\d{2}$/
const ID=/^[A-Za-z0-9-]{1,160}$/

async function administratorMutation(request:Request){
  if(!isSameOrigin(request))return {error:json({error:'Forbidden.'},403)}
  const session=await readAdministratorSession(request)
  if(!session)return {error:json({error:'Administrator access required.'},403)}
  return {session}
}

function validIssue(issueNumber:string,issueDate:string){
  if(!ISSUE_NUMBER.test(issueNumber)||!DATE.test(issueDate))return false
  const parsedDate=Date.parse(`${issueDate}T00:00:00.000Z`)
  return Number.isFinite(parsedDate)&&new Date(parsedDate).toISOString().slice(0,10)===issueDate
}

export async function listAdminAnswerSheets(request:Request){
  if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
  try {
    const rows=await lifecycleBindings().db.prepare(`SELECT a.id,a.issue_number,a.issue_date,a.asset_id,a.created_at,o.original_name,o.size_bytes
      FROM answer_sheets a JOIN object_storage_records o ON o.id=a.asset_id
      WHERE o.deleted_at IS NULL ORDER BY a.issue_date DESC,a.issue_number DESC`).all()
    return json({answers:rows.results})
  } catch {
    return json({error:'Answer sheets are temporarily unavailable.'},503)
  }
}

export async function uploadAdminAnswerSheet(request:Request){
  const auth=await administratorMutation(request);if(auth.error)return auth.error
  const {session}=auth
  if(request.headers.get('x-csrf-token')!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const issueNumber=(request.headers.get('x-issue-number')??'').trim(),issueDate=(request.headers.get('x-issue-date')??'').trim()
  const contentType=(request.headers.get('content-type')??'').split(';')[0].toLowerCase(),size=Number(request.headers.get('content-length')??request.headers.get('x-file-size'))
  if(!validIssue(issueNumber,issueDate)||!Number.isSafeInteger(size)||size<1||size>MAX_ANSWER_PDF||contentType!==PDF||!request.body)return json({error:'Enter an issue number and date, then upload a PDF no larger than 25 MB.'},422)
  const db=lifecycleBindings().db
  if(await db.prepare('SELECT id FROM answer_sheets WHERE issue_number=?').bind(issueNumber).first())return json({error:'An answer sheet already exists for this issue number.'},409)
  const answerId=crypto.randomUUID()
  try {
    const assetId=await storeObject({category:'answer_sheet',relatedType:'answer_sheet',relatedId:answerId,originalName:request.headers.get('x-file-name')??`offlimits-${issueNumber}-answers.pdf`,contentType,size,createdBy:session.user.id,body:request.body,visibility:'published'})
    const now=Date.now()
    await db.prepare(`INSERT INTO answer_sheets(id,issue_number,issue_date,asset_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(answerId,issueNumber,issueDate,assetId,session.user.id,now,now).run()
    await audit(db,session.user.id,'answer_sheet.published','answer_sheet',answerId,{issueNumber,issueDate,assetId})
    return json({ok:true,id:answerId,assetId},201)
  } catch (error) {
    console.error(JSON.stringify({message:'answer_sheet_upload_failed',error:error instanceof Error?error.message:'unknown'}))
    return json({error:'The PDF could not be uploaded. Please try again.'},503)
  }
}

export async function updateAdminAnswerSheet(request:Request){
  const auth=await administratorMutation(request);if(auth.error)return auth.error
  const {session}=auth
  let body:{id?:unknown;issueNumber?:unknown;issueDate?:unknown;csrf?:unknown}
  try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
  if(body.csrf!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const id=typeof body.id==='string'?body.id.trim():'',issueNumber=typeof body.issueNumber==='string'?body.issueNumber.trim():'',issueDate=typeof body.issueDate==='string'?body.issueDate.trim():''
  if(!ID.test(id)||!validIssue(issueNumber,issueDate))return json({error:'Enter a valid issue name and date.'},422)
  try{
    const db=lifecycleBindings().db,result=await db.prepare(`UPDATE answer_sheets SET issue_number=?,issue_date=?,updated_at=? WHERE id=?`).bind(issueNumber,issueDate,Date.now(),id).run()
    if((result.meta.changes??0)!==1)return json({error:'Answer sheet not found.'},404)
    await audit(db,session.user.id,'answer_sheet.updated','answer_sheet',id,{issueNumber,issueDate})
    return json({ok:true})
  }catch{return json({error:'That issue name is already in use.'},409)}
}

export async function replaceAdminAnswerSheet(request:Request){
  const auth=await administratorMutation(request);if(auth.error)return auth.error
  const {session}=auth
  if(request.headers.get('x-csrf-token')!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const id=(request.headers.get('x-answer-id')??'').trim(),contentType=(request.headers.get('content-type')??'').split(';')[0].toLowerCase(),size=Number(request.headers.get('content-length')??request.headers.get('x-file-size'))
  if(!ID.test(id)||!Number.isSafeInteger(size)||size<1||size>MAX_ANSWER_PDF||contentType!==PDF||!request.body)return json({error:'Upload a PDF no larger than 25 MB.'},422)
  const db=lifecycleBindings().db,answer=await db.prepare(`SELECT id,asset_id,issue_number FROM answer_sheets WHERE id=?`).bind(id).first<{id:string;asset_id:string;issue_number:string}>()
  if(!answer)return json({error:'Answer sheet not found.'},404)
  let assetId=''
  try{
    assetId=await storeObject({category:'answer_sheet',relatedType:'answer_sheet',relatedId:id,originalName:request.headers.get('x-file-name')??`offlimits-${answer.issue_number}-answers.pdf`,contentType,size,createdBy:session.user.id,body:request.body,visibility:'published'})
    await db.prepare(`UPDATE answer_sheets SET asset_id=?,updated_at=? WHERE id=?`).bind(assetId,Date.now(),id).run()
    try{await retireObject(answer.asset_id)}catch(error){console.error(JSON.stringify({message:'answer_sheet_old_asset_retire_failed',id,error:error instanceof Error?error.message:'unknown'}))}
    await audit(db,session.user.id,'answer_sheet.replaced','answer_sheet',id,{assetId})
    return json({ok:true,assetId})
  }catch(error){
    if(assetId)try{await retireObject(assetId)}catch{}
    console.error(JSON.stringify({message:'answer_sheet_replace_failed',error:error instanceof Error?error.message:'unknown'}))
    return json({error:'The replacement PDF could not be uploaded. Please try again.'},503)
  }
}

export async function deleteAdminAnswerSheet(request:Request){
  const auth=await administratorMutation(request);if(auth.error)return auth.error
  const {session}=auth
  let body:{id?:unknown;csrf?:unknown}
  try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
  if(body.csrf!==session.csrf)return json({error:'Your session changed. Refresh and retry.'},403)
  const id=typeof body.id==='string'?body.id.trim():''
  if(!ID.test(id))return json({error:'Invalid answer sheet.'},422)
  const db=lifecycleBindings().db,answer=await db.prepare(`SELECT asset_id FROM answer_sheets WHERE id=?`).bind(id).first<{asset_id:string}>()
  if(!answer)return json({error:'Answer sheet not found.'},404)
  await db.prepare(`DELETE FROM answer_sheets WHERE id=?`).bind(id).run()
  try{await retireObject(answer.asset_id)}catch(error){console.error(JSON.stringify({message:'answer_sheet_asset_retire_failed',id,error:error instanceof Error?error.message:'unknown'}))}
  await audit(db,session.user.id,'answer_sheet.deleted','answer_sheet',id,{})
  return json({ok:true})
}

export const Route=createFileRoute('/api/admin/answers')({server:{handlers:{GET:({request})=>listAdminAnswerSheets(request),POST:({request})=>uploadAdminAnswerSheet(request),PATCH:({request})=>updateAdminAnswerSheet(request),PUT:({request})=>replaceAdminAnswerSheet(request),DELETE:({request})=>deleteAdminAnswerSheet(request)}}})
