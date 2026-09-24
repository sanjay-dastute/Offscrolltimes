import { useState } from 'react'
import { CTA_OUTLINE } from '#/lib/uiKit'

export function DamageEvidenceUpload({subscriptionId,csrf}:{subscriptionId:string;csrf:string}){
  const [status,setStatus]=useState('')
  async function upload(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file)return
    setStatus('Uploading…')
    const response=await fetch('/api/customer/files',{method:'POST',headers:{'Content-Type':file.type,'X-File-Size':String(file.size),'X-CSRF-Token':csrf,'X-Subscription-Id':subscriptionId,'X-File-Name':file.name},body:file})
    const result=await response.json() as {error?:string}
    setStatus(response.ok?'Evidence uploaded securely.':result.error??'Upload failed.')
    event.target.value=''
  }
  return <label className={`${CTA_OUTLINE} cursor-pointer`}><span>Upload damage evidence</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event=>void upload(event)}/>{status&&<span className="ml-2 text-xs normal-case" role="status">{status}</span>}</label>
}
