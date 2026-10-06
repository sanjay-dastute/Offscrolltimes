import { useEffect, useState } from 'react'
import { CTA, CTA_OUTLINE, FIELD, H2 } from '#/lib/uiKit'

type AnswerSheet={id:string;issue_number:string;issue_date:string;asset_id:string;created_at:number;original_name:string;size_bytes:number}

export function AdminAnswers({csrf}:{csrf:string}){
  const [answers,setAnswers]=useState<AnswerSheet[]>([]),[status,setStatus]=useState(''),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[revision,setRevision]=useState(0)
  useEffect(()=>{void fetch('/api/admin/answers').then(async response=>{const body=await response.json() as {answers?:AnswerSheet[];error?:string};if(!response.ok)throw new Error(body.error||'Could not load answer sheets.');setAnswers(body.answers??[])}).catch(error=>setStatus(error instanceof Error?error.message:'Could not load answer sheets.')).finally(()=>setLoading(false))},[revision])
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(uploading)return
    const form=event.currentTarget,data=new FormData(form),file=data.get('pdf') as File|null,issueNumber=String(data.get('issueNumber')??'').trim(),issueDate=String(data.get('issueDate')??'').trim()
    if(!file){setStatus('Choose a PDF answer sheet first.');return}
    setUploading(true);setStatus('Uploading PDF…')
    try{const response=await fetch('/api/admin/answers',{method:'POST',headers:{'Content-Type':file.type,'X-CSRF-Token':csrf,'X-Issue-Number':issueNumber,'X-Issue-Date':issueDate,'X-File-Name':file.name,'X-File-Size':String(file.size)},body:file});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Upload failed.');form.reset();setStatus('Answer sheet published on OFFLIMITS.');setRevision(value=>value+1)}catch(error){setStatus(error instanceof Error?error.message:'Upload failed.')}finally{setUploading(false)}
  }
  return <section><p className="font-mono text-xs tracking-[.12em] text-red-600 uppercase">OFFLIMITS</p><h2 className={H2}>Answers</h2><p className="mt-3 max-w-2xl text-sm text-graphite-soft">Upload an official PDF answer sheet. It is published immediately on the public OFFLIMITS page.</p>
    <form onSubmit={submit} className="mt-6 grid max-w-3xl gap-4 rounded-2xl border border-graphite bg-paper p-5 sm:grid-cols-2"><label>Issue number<input required name="issueNumber" maxLength={80} placeholder="For example: 1 or Replay Special Edition" className={`${FIELD} mt-2`}/></label><label>Date of issue<input required name="issueDate" type="date" className={`${FIELD} mt-2`}/></label><label className="sm:col-span-2">Answer sheet PDF<input required name="pdf" type="file" accept="application/pdf,.pdf" className={`${FIELD} mt-2`}/></label><p className="text-sm text-graphite-soft sm:col-span-2">PDF only, maximum 25 MB. Each issue number can have one published answer sheet.</p><button disabled={uploading} className={`${CTA} w-fit sm:col-span-2`}>{uploading?'Uploading…':'Upload and publish answers'}</button></form>
    {status&&<p role="status" className="mt-4">{status}</p>}
    <div className="mt-8 grid gap-3">{loading&&<p>Loading answer sheets…</p>}{!loading&&!answers.length&&<p>No answer sheets have been uploaded yet.</p>}{answers.map(answer=><article key={answer.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-graphite bg-paper p-5"><div><h3 className="text-lg font-bold">Issue {answer.issue_number}</h3><p className="mt-1 text-sm">{answer.issue_date} · {answer.original_name} · {(answer.size_bytes/1024/1024).toFixed(1)} MB</p></div><a className={CTA_OUTLINE} href={`/api/assets/${answer.asset_id}`} target="_blank" rel="noreferrer">Download PDF</a></article>)}</div>
  </section>
}
