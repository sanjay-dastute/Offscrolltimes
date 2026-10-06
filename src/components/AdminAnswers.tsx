import { useEffect, useState } from 'react'
import { CTA, CTA_OUTLINE, FIELD, H2 } from '#/lib/uiKit'

type AnswerSheet={id:string;issue_number:string;issue_date:string;asset_id:string;created_at:number;original_name:string;size_bytes:number}

export function AdminAnswers({csrf}:{csrf:string}){
  const [answers,setAnswers]=useState<AnswerSheet[]>([]),[status,setStatus]=useState(''),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[revision,setRevision]=useState(0)
  useEffect(()=>{setLoading(true);void fetch('/api/admin/answers').then(async response=>{const body=await response.json() as {answers?:AnswerSheet[];error?:string};if(!response.ok)throw new Error(body.error||'Could not load answer sheets.');setAnswers(body.answers??[])}).catch(error=>setStatus(error instanceof Error?error.message:'Could not load answer sheets.')).finally(()=>setLoading(false))},[revision])
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(uploading)return
    const form=event.currentTarget,data=new FormData(form),file=data.get('pdf') as File|null,issueNumber=String(data.get('issueNumber')??'').trim(),issueDate=String(data.get('issueDate')??'').trim()
    if(!file){setStatus('Choose a PDF answer sheet first.');return}
    setUploading(true);setStatus('Uploading PDF…')
    try{const response=await fetch('/api/admin/answers',{method:'POST',headers:{'Content-Type':file.type,'X-CSRF-Token':csrf,'X-Issue-Number':issueNumber,'X-Issue-Date':issueDate,'X-File-Name':file.name,'X-File-Size':String(file.size)},body:file}),result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Upload failed.');form.reset();setStatus('Answer sheet published on OFFLIMITS.');setRevision(value=>value+1)}catch(error){setStatus(error instanceof Error?error.message:'Upload failed.')}finally{setUploading(false)}
  }
  async function rename(answer:AnswerSheet){
    const issueNumber=window.prompt('Issue name or number',answer.issue_number);if(!issueNumber?.trim())return
    const issueDate=window.prompt('Date of issue (YYYY-MM-DD)',answer.issue_date);if(!issueDate?.trim())return
    setUploading(true);setStatus('Saving answer-sheet details…')
    try{const response=await fetch('/api/admin/answers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf,id:answer.id,issueNumber,issueDate})}),result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Could not save answer-sheet details.');setStatus('Answer-sheet details saved.');setRevision(value=>value+1)}catch(error){setStatus(error instanceof Error?error.message:'Could not save answer-sheet details.')}finally{setUploading(false)}
  }
  async function replace(answer:AnswerSheet,event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';if(!file)return
    if(!window.confirm(`Replace the PDF for Issue ${answer.issue_number}?`))return
    setUploading(true);setStatus('Replacing PDF…')
    try{const response=await fetch('/api/admin/answers',{method:'PUT',headers:{'Content-Type':file.type,'X-CSRF-Token':csrf,'X-Answer-Id':answer.id,'X-File-Name':file.name,'X-File-Size':String(file.size)},body:file}),result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Could not replace the PDF.');setStatus('Answer-sheet PDF replaced.');setRevision(value=>value+1)}catch(error){setStatus(error instanceof Error?error.message:'Could not replace the PDF.')}finally{setUploading(false)}
  }
  async function remove(answer:AnswerSheet){
    if(!window.confirm(`Delete the published answers for Issue ${answer.issue_number}? This cannot be undone.`))return
    setUploading(true);setStatus('Deleting answer sheet…')
    try{const response=await fetch('/api/admin/answers',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf,id:answer.id})}),result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Could not delete the answer sheet.');setStatus('Answer sheet deleted.');setRevision(value=>value+1)}catch(error){setStatus(error instanceof Error?error.message:'Could not delete the answer sheet.')}finally{setUploading(false)}
  }
  return <section><p className="font-mono text-xs tracking-[.12em] text-red-600 uppercase">OFFLIMITS</p><h2 className={H2}>Answers</h2><p className="mt-3 max-w-2xl text-sm text-graphite-soft">Upload an official PDF answer sheet. It is published immediately on the public OFFLIMITS page.</p>
    <form onSubmit={submit} className="mt-6 grid max-w-3xl gap-4 rounded-2xl border border-graphite bg-paper p-5 sm:grid-cols-2"><label>Issue number<input required name="issueNumber" maxLength={80} placeholder="For example: 1 or Replay Special Edition" className={`${FIELD} mt-2`}/></label><label>Date of issue<input required name="issueDate" type="date" className={`${FIELD} mt-2`}/></label><label className="sm:col-span-2">Answer sheet PDF<input required name="pdf" type="file" accept="application/pdf,.pdf" className={`${FIELD} mt-2`}/></label><p className="text-sm text-graphite-soft sm:col-span-2">PDF only, maximum 25 MB. Each issue number can have one published answer sheet.</p><button disabled={uploading} className={`${CTA} w-fit sm:col-span-2`}>{uploading?'Uploading…':'Upload and publish answers'}</button></form>
    {status&&<p role="status" className="mt-4">{status}</p>}
    <div className="mt-8 grid gap-3">{loading&&<p>Loading answer sheets…</p>}{!loading&&!answers.length&&<p>No answer sheets have been uploaded yet.</p>}{answers.map(answer=><article key={answer.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-graphite bg-paper p-5"><div><h3 className="text-lg font-bold">Issue {answer.issue_number}</h3><p className="mt-1 text-sm">{answer.issue_date} · {answer.original_name} · {(answer.size_bytes/1024/1024).toFixed(1)} MB</p></div><div className="flex flex-wrap gap-2"><a className={CTA_OUTLINE} href={`/api/assets/${answer.asset_id}`} target="_blank" rel="noreferrer">Download PDF</a><button disabled={uploading} className={CTA_OUTLINE} onClick={()=>void rename(answer)}>Edit name</button><label className={`${CTA_OUTLINE} cursor-pointer`}><span>Re-upload PDF</span><input disabled={uploading} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={event=>void replace(answer,event)}/></label><button disabled={uploading} className={CTA_OUTLINE} onClick={()=>void remove(answer)}>Delete</button></div></article>)}</div>
  </section>
}
