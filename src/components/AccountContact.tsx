import { useState } from 'react'
import { CTA, FIELD } from '#/lib/uiKit'

export type ContactProfile={display_name:string|null;email:string|null;phone:string|null;whatsapp_number:string|null}
export function AccountContact({profile,csrf,onSaved}:{profile:ContactProfile|null;csrf:string;onSaved?:()=>Promise<void>}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setMessage('')
    const fields=Object.fromEntries(new FormData(event.currentTarget))
    try {
      const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.contact',csrf,...fields})})
      const result=await response.json() as {error?:string}
      if(!response.ok)throw new Error(result.error||'Contact details could not be saved.')
      setMessage('Contact details saved.')
      await onSaved?.()
    }catch(cause){setError(cause instanceof Error?cause.message:'Please retry.')}finally{setBusy(false)}
  }
  return <section className="mt-10 rounded-2xl border border-graphite bg-paper p-6"><h2 className="text-2xl font-bold">Contact details</h2><p className="mt-2 text-sm">Keep your contact details current. Your login email and existing order details remain separate.</p><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={save}>
    <label>Full name<input name="name" required maxLength={100} autoComplete="name" defaultValue={profile?.display_name||''} className={FIELD}/></label>
    <label>Contact email<input name="email" type="email" required autoComplete="email" defaultValue={profile?.email||''} className={FIELD}/></label>
    <label className="sm:col-span-2">WhatsApp number (with country code)<input name="whatsapp" type="tel" required pattern="\+[1-9][0-9]{7,14}" autoComplete="tel" defaultValue={profile?.whatsapp_number||profile?.phone||''} className={FIELD}/></label>
    <button disabled={busy} className={`${CTA} sm:col-span-2`}>{busy?'Saving…':'Save contact details'}</button>
  </form>{message&&<p className="mt-3" role="status">{message}</p>}{error&&<p className="mt-3 text-red-700" role="alert">{error}</p>}</section>
}
