import { useEffect, useState } from 'react'
import { CTA } from '#/lib/uiKit'

export function BlogSubscription() {
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[manageUrl,setManageUrl]=useState('')
  useEffect(()=>setReady(true),[])
  async function subscribe(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return
    const form=event.currentTarget,fields=new FormData(form)
    setBusy(true);setError('');setMessage('');setManageUrl('')
    try {
      const response=await fetch('/api/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fields.get('email'),consent:fields.get('consent')==='on',website:fields.get('website')})})
      const result=await response.json() as {message?:string;error?:string;manageUrl?:string}
      if(!response.ok)throw new Error(result.error||'Please try again.')
      setMessage(result.message||'Your signup has been saved.');setManageUrl(result.manageUrl||'');form.reset()
    }catch(cause){setError(cause instanceof Error?cause.message:'Email signup failed. Please try again.')}finally{setBusy(false)}
  }
  return <div className="min-w-0">
    <h2 className="m-0 font-display text-2xl font-bold">Stay in Loop, OFFSCROLLERS!</h2>
    <form onSubmit={subscribe} action="/api/newsletter" method="post" className="mt-4">
      <div className="flex max-w-xl flex-col gap-3 sm:flex-row lg:flex-col">
        <label className="min-w-0 flex-1"><span className="sr-only">Email address for blog updates</span><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Email address" className="w-full rounded-full border border-graphite bg-paper px-5 py-4 text-base text-graphite"/></label>
        <button type="submit" disabled={!ready||busy} className={`${CTA} disabled:cursor-wait disabled:opacity-60`}>{busy?'Subscribing…':'Subscribe'}</button>
      </div>
      <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed"><input name="consent" type="checkbox" required className="mt-0.5 shrink-0"/><span>I agree to receive Offscroll Times email updates. <a href="/policies/privacy" className="underline">Privacy policy</a>. Unsubscribe using your signup management link or contact support.</span></label>
    </form>
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
    {manageUrl&&<a href={manageUrl} className="mt-2 inline-block text-xs underline">Manage email signup</a>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-900">{error}</p>}
  </div>
}
