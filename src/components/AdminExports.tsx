import { useState } from 'react'
import { ADMIN_EXPORTS } from '#/content/admin-exports'
import { CTA_OUTLINE,H2 } from '#/lib/uiKit'
export function AdminExports({csrf}:{csrf:string}){
  const [busy,setBusy]=useState(''),[error,setError]=useState('')
  async function download(dataset:string,format:'csv'|'json'){
    setBusy(`${dataset}-${format}`);setError('')
    try{
      const response=await fetch('/api/admin/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset,format,csrf})})
      if(!response.ok){const result=await response.json() as {error?:string};throw new Error(result.error??'Download failed.')}
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a')
      link.href=url;link.download=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]??`${dataset}.${format}`
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
    }catch(error){setError(error instanceof Error?error.message:'Download failed. Please retry.')}finally{setBusy('')}
  }
  return <section><h2 className={H2}>Export data</h2><p className="mt-3 text-graphite-soft">Download each category separately. CSV opens in Excel or Google Sheets; JSON preserves the stored values. Each download includes all records in that category.</p>{error&&<p role="alert" className="mt-4 text-red-800">{error}</p>}<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ADMIN_EXPORTS.map(([key,title,description])=><article key={key} className="rounded-2xl border border-graphite bg-paper p-5"><h3 className="text-xl font-bold">{title}</h3><p className="mt-2 text-sm">{description}</p><div className="mt-4 flex flex-wrap gap-3">{(['csv','json'] as const).map(format=><button key={format} disabled={Boolean(busy)} onClick={()=>void download(key,format)} className={CTA_OUTLINE} aria-label={`Download ${title} ${format.toUpperCase()}`}>{busy===`${key}-${format}`?'Downloading…':format.toUpperCase()}</button>)}</div></article>)}</div></section>
}
