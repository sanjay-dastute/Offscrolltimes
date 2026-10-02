import { useState } from 'react'
import { ADMIN_EXPORTS } from '#/content/admin-exports'
import { CTA_OUTLINE,H2 } from '#/lib/uiKit'
export function AdminExports({csrf}:{csrf:string}){
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[dataset,setDataset]=useState('customers')
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
  const categories=ADMIN_EXPORTS.filter(([key])=>['customers','orders','subscriptions','payments','newsletter','fulfilments','discounts'].includes(key))
  return <section><h2 className={H2}>Export data</h2><p className="mt-3 text-graphite-soft">Choose the data you need and download a CSV for Excel or Google Sheets. Downloads include all records.</p><div className="mt-6 flex max-w-xl flex-wrap items-end gap-4 rounded-2xl border border-graphite bg-paper p-6"><label className="grid flex-1 gap-2"><span className="font-semibold">Data to download</span><select value={dataset} onChange={event=>setDataset(event.target.value)} className="rounded-xl border border-graphite bg-paper px-4 py-3">{categories.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><button disabled={Boolean(busy)} onClick={()=>void download(dataset,'csv')} className={CTA_OUTLINE}>{busy?'Downloading...':'Download CSV'}</button></div>{error&&<p role="alert" className="mt-4 text-red-800">{error}</p>}</section>
}
