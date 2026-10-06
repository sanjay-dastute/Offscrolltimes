import { createFileRoute } from '@tanstack/react-router'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'

export type PublicAnswerSheet = { issueNumber:string; issueDate:string; assetId:string }

export async function listPublicAnswerSheets(){
  try {
    const rows=await lifecycleBindings().db.prepare(`SELECT issue_number,issue_date,asset_id
      FROM answer_sheets ORDER BY issue_date DESC,issue_number DESC`).all<{issue_number:string;issue_date:string;asset_id:string}>()
    return json({answers:rows.results.map(row=>({issueNumber:row.issue_number,issueDate:row.issue_date,assetId:row.asset_id}))})
  } catch {
    return json({error:'Answer sheets are temporarily unavailable.'},503)
  }
}

export const Route=createFileRoute('/api/answers')({server:{handlers:{GET:()=>listPublicAnswerSheets()}}})
