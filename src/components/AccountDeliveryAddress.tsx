import { useEffect, useState } from 'react'
import type { CustomerAddress } from '#/lib/customer/store.server'
import { CTA, CTA_OUTLINE, FIELD } from '#/lib/uiKit'

export function AccountDeliveryAddress({address,csrf,onSaved,embedded=false}:{address:CustomerAddress|null;csrf:string;onSaved?:()=>Promise<void>;embedded?:boolean}) {
  const [savedAddress,setSavedAddress]=useState(address),[editing,setEditing]=useState(!address)
  useEffect(()=>{if(address)setSavedAddress(address)},[address])
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return
    const fields=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setMessage('');setError('')
    try {
      const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.address',csrf,address:fields})})
      const result=await response.json() as {error?:string}
      if(!response.ok)throw new Error(result.error||'Your address could not be saved.')
      setMessage('Default delivery address saved for your subscriptions.')
      setEditing(false)
      setSavedAddress(fields as unknown as CustomerAddress)
      await onSaved?.()
    }catch(cause){setError(cause instanceof Error?cause.message:'Please retry.')}finally{setBusy(false)}
  }
  return <section className={embedded?"mt-8 border-t border-rule pt-6":"mt-6 rounded-2xl border border-graphite bg-paper p-6"}><h2 className="text-2xl font-bold">Delivery address</h2><p className="mt-2 text-sm">One default address is used for your subscriptions and future checkouts. Changes saved by the 20th apply to the next eligible edition; later changes apply to a subsequent edition.</p>{editing&&<form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
    {([['name','Recipient name'],['line1','Address line 1'],['line2','Address line 2 (optional)'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country code']] as const).map(([key,label])=><label key={key}>{label}<input name={key} defaultValue={savedAddress?.[key]??(key==='country'?'IN':'')} required={key!=='line2'} maxLength={key==='country'?2:160} className={FIELD}/></label>)}
    <button disabled={busy} className={`${CTA} sm:col-span-2`}>{busy?'Saving…':'Save delivery address'}</button>
  </form>}{!editing&&savedAddress&&<div className="mt-6 rounded-xl border border-rule p-4"><address className="mt-2 not-italic leading-6">{savedAddress.name}<br/>{savedAddress.line1}{savedAddress.line2&&<><br/>{savedAddress.line2}</>}<br/>{savedAddress.city}, {savedAddress.region} {savedAddress.postalCode}<br/>{savedAddress.country}</address><button type="button" className={`${CTA_OUTLINE} mt-4`} onClick={()=>setEditing(true)}>Change address</button></div>}{message&&<p role="status" className="mt-3">{message}</p>}{error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}</section>
}
