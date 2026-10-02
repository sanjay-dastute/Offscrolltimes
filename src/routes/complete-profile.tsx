import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { CTA, FIELD } from '#/lib/uiKit'

export const Route = createFileRoute('/complete-profile')({
  validateSearch: (search: Record<string,unknown>) => ({ returnTo: typeof search.returnTo==='string' && search.returnTo.startsWith('/') && !search.returnTo.startsWith('//') && !search.returnTo.includes('\\') && !search.returnTo.startsWith('/complete-profile') ? search.returnTo : '/account' }),
  head: () => ({meta:[{title:'Complete your profile | Offscroll Times'},{name:'robots',content:'noindex, nofollow'}]}),
  component: CompleteProfile,
})

type ProfileData={csrf:string;profile:Record<string,string|null>|null;address:Record<string,string|null>|null;user:{name?:string;email?:string}}

function CompleteProfile() {
  const {returnTo} = Route.useSearch()
  const [data,setData]=useState<ProfileData|null>(null)
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{let active=true;fetch('/api/customer').then(async response=>{
    if(response.status===401){window.location.assign(`/login?returnTo=${encodeURIComponent('/complete-profile?returnTo='+encodeURIComponent(returnTo))}`);return}
    if(!response.ok)throw new Error('Your profile could not be loaded. Please refresh and retry.')
    const result=await response.json() as ProfileData;if(active)setData(result)
  }).catch(cause=>{if(active)setError(cause.message)});return()=>{active=false}},[returnTo])
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!data||busy)return
    const fields=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setError('')
    try {
      const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile.complete',csrf:data.csrf,name:fields.name,email:fields.email,whatsapp:fields.whatsapp,address:{name:fields.name,line1:fields.line1,city:fields.city,region:fields.region,postalCode:fields.postalCode,country:fields.country}})})
      const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Your details could not be saved.')
      window.location.assign(returnTo)
    }catch(cause){setError(cause instanceof Error?cause.message:'Please retry.');setBusy(false)}
  }
  const fields=[['name','Full name','text',data?.profile?.display_name||data?.user.name||''],['email','Email address','email',data?.profile?.email||data?.user.email||''],['whatsapp','WhatsApp number (with country code)','tel',data?.profile?.whatsapp_number||''],['line1','Full delivery address','text',[data?.address?.line1,data?.address?.line2].filter(Boolean).join(', ')],['city','City','text',data?.address?.city||''],['region','State / region','text',data?.address?.region||''],['postalCode','Postal code','text',data?.address?.postalCode||''],['country','Country code (IN for India)','text',data?.address?.country||'IN']]
  return <><SiteHeader/><main className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-4xl font-bold">Complete your profile</h1><p className="mt-4">All fields are required. We’ll use this as your default delivery address for subscriptions.</p>{data?<form onSubmit={save} className="mt-8 grid gap-5 rounded-2xl border border-graphite bg-paper p-6 sm:grid-cols-2">{fields.map(([name,label,type,value])=><label key={name} className={name==='line1'?'sm:col-span-2':''}>{label}<input className={`${FIELD} mt-2`} name={name} type={type} defaultValue={value} required maxLength={name==='country'?2:160} pattern={name==='whatsapp'?'\+[1-9][0-9]{7,14}':name==='country'?'[a-zA-Z]{2}':undefined}/></label>)}<button className={`${CTA} sm:col-span-2`} disabled={busy}>{busy?'Saving…':'Save and continue'}</button></form>:!error&&<p className="mt-6" role="status">Loading your details…</p>}{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}</main><SiteFooter/></>
}
