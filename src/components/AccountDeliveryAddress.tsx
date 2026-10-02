import { useState } from 'react'
import type { CustomerAddress } from '#/lib/customer/store.server'
import { CTA, FIELD } from '#/lib/uiKit'

export function AccountDeliveryAddress({address,csrf}:{address:CustomerAddress|null;csrf:string}) {
  const [savedAddress,setSavedAddress]=useState(address)
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return
    const fields=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setMessage('');setError('')
    try {
      const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.address',csrf,address:fields})})
      const result=await response.json() as {error?:string}
      if(!response.ok)throw new Error(result.error||'Your address could not be saved.')
      setMessage('Delivery address saved.')
      setSavedAddress(fields as unknown as CustomerAddress)
    }catch(cause){setError(cause instanceof Error?cause.message:'Please retry.')}finally{setBusy(false)}
  }
  return <section className="mt-6 rounded-2xl border border-graphite bg-paper p-6"><h2 className="text-2xl font-bold">Delivery address</h2><p className="mt-2 text-sm">Save your address in your profile. Review the delivery address when you subscribe.</p><form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
    {([['name','Recipient name'],['line1','Address line 1'],['line2','Address line 2 (optional)'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country code']] as const).map(([key,label])=><label key={key}>{label}<input name={key} defaultValue={address?.[key]??(key==='country'?'IN':'')} required={key!=='line2'} maxLength={key==='country'?2:160} className={FIELD}/></label>)}
    <button disabled={busy} className={`${CTA} sm:col-span-2`}>{busy?'Saving…':'Save delivery address'}</button>
  </form>{savedAddress&&<div className="mt-6 rounded-xl border border-rule p-4"><h3 className="font-bold">Saved delivery address</h3><address className="mt-2 not-italic leading-6">{savedAddress.name}<br/>{savedAddress.line1}{savedAddress.line2&&<><br/>{savedAddress.line2}</>}<br/>{savedAddress.city}, {savedAddress.region} {savedAddress.postalCode}<br/>{savedAddress.country}</address></div>}{message&&<p role="status" className="mt-3">{message}</p>}{error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}</section>
}
