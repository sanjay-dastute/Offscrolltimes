import { useEffect, useState } from 'react'
import { CTA, CTA_OUTLINE, FIELD, H2 } from '#/lib/uiKit'

type Customer = {deletion_request_id?:string|null;user_id:string;display_name:string|null;email:string|null;phone:string|null;whatsapp_number:string|null;account_state:string;subscription_count:number;subscription_status:string|null;payment_status:string|null;address:{name:string;line1:string;line2?:string;city:string;region?:string;postalCode:string;country:string}|null}
type NewsletterSubscriber={id:string;email:string;created_at:number}
type Directory = {customers:Customer[];newsletterSubscribers:NewsletterSubscriber[];page:number;pages:number;total:number}

export function AdminCustomers({mutate,csrf,initialGroup='all'}:{mutate:(payload:Record<string,unknown>)=>Promise<boolean>;csrf:string;initialGroup?:'all'|'newsletter'}) {
  const [data,setData]=useState<Directory|null>(null),[query,setQuery]=useState(''),[status,setStatus]=useState<string>(initialGroup),[page,setPage]=useState(1),[revision,setRevision]=useState(0)
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[editing,setEditing]=useState<Customer|null>(null),[saving,setSaving]=useState(false)
  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true);setError('')
    const timer=window.setTimeout(()=>{
      void fetch(`/api/admin/customers?${new URLSearchParams({query,status,page:String(page)})}`,{signal:controller.signal}).then(async response=>{
        const result=await response.json() as Directory & {error?:string}
        if(!response.ok)throw new Error(result.error||'Customer directory could not be loaded.')
        setData(result as Directory)
      }).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Customer directory could not be loaded.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    },200)
    return()=>{window.clearTimeout(timer);controller.abort()}
  },[query,status,page,revision])
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!editing||saving)return
    const fields=Object.fromEntries(new FormData(event.currentTarget));setSaving(true)
    try{if(await mutate({action:'customer.contact',userId:editing.user_id,...fields})){setEditing(null);setRevision(value=>value+1)}}finally{setSaving(false)}
  }
  async function remove(customer:Customer){
    if(!customer.deletion_request_id||saving)return
    if(!window.confirm('Delete this requested account? This removes all account access, stops automatic renewal and erases profile/contact/address data. Protected order, payment and audit history is retained. This cannot be undone.'))return
    setSaving(true)
    try{if(await mutate({action:'customer.delete',userId:customer.user_id,requestId:customer.deletion_request_id,confirm:true})){setEditing(null);setRevision(value=>value+1)}}finally{setSaving(false)}
  }
  async function downloadSubscribers(){
    const response=await fetch('/api/admin/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset:'newsletter',format:'txt',csrf})})
    if(!response.ok){setError('Newsletter export could not be downloaded.');return}
    const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='offscroll-newsletter-subscribers.txt';link.click();URL.revokeObjectURL(url)
  }
  return <section>
    <h2 className={H2}>{status==='newsletter'?'Newsletter subscribers':'Customer directory'}</h2>
    <p className="mt-3 text-sm">{status==='newsletter'?'People who explicitly opted in to Offscroll Times email updates.':'All registered users, including people who have not subscribed. Payment status refers to the latest recorded payment.'}</p>
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      <label>Name, email, phone or WhatsApp<input className={`${FIELD} mt-2`} type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}}/></label>
      <label>Customer group<select className={`${FIELD} mt-2`} value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="all">All registered users</option><option value="subscribers">Has a subscription</option><option value="registered">No subscription yet</option><option value="newsletter">Newsletter subscribers</option><option value="deletion">Deletion requested</option></select></label>
    </div>
    {error&&<div role="alert" className="my-4"><p>{error}</p><button className={CTA_OUTLINE} onClick={()=>setRevision(value=>value+1)}>Retry</button></div>}
    {loading&&<p role="status">Loading customers…</p>}
    {!loading&&!error&&data&&<>{status==='newsletter'?<section className="rounded-2xl border border-graphite bg-paper p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold">Newsletter subscribers</h3><p className="mt-1 text-sm">{data.newsletterSubscribers.length} active subscribers. Unsubscribed addresses are excluded.</p></div><button className={CTA} onClick={()=>void downloadSubscribers()}>Download emails (.txt)</button></div><div className="mt-5 grid gap-2">{data.newsletterSubscribers.map(subscriber=><p className="rounded-xl border border-rule p-3" key={subscriber.id}>{subscriber.email}</p>)}{!data.newsletterSubscribers.length&&<p>No active newsletter subscribers.</p>}</div></section>:<>
      <p className="mb-4 text-sm">{data.total} users · Page {data.page} of {data.pages}</p>
      {!data.customers.length&&<p>No customers match these filters.</p>}
      <div className="grid gap-4">{data.customers.map(customer=><article key={customer.user_id} className="rounded-2xl border border-graphite bg-paper p-5">
        <h3 className="text-xl font-bold">{customer.display_name||customer.address?.name||'Name not provided'}</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="font-bold">Email</dt><dd>{customer.email?<a href={`mailto:${customer.email}`}>{customer.email}</a>:'Not provided'}</dd></div><div><dt className="font-bold">Phone</dt><dd>{customer.phone||'Not provided'}</dd></div><div><dt className="font-bold">WhatsApp</dt><dd>{customer.whatsapp_number?<a className="underline" href={`https://wa.me/${customer.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer">{customer.whatsapp_number}</a>:'Not provided'}</dd></div><div><dt className="font-bold">Account</dt><dd>{customer.account_state}</dd></div><div><dt className="font-bold">Subscriptions</dt><dd>{customer.subscription_count} · {customer.subscription_status||'Not subscribed'}</dd></div><div><dt className="font-bold">Latest payment</dt><dd>{customer.payment_status||'No payment recorded'}</dd></div></dl>
        <div className="mt-4"><strong>Delivery address</strong><address className="mt-1 not-italic">{customer.address?<>{customer.address.name}<br/>{customer.address.line1}{customer.address.line2&&<><br/>{customer.address.line2}</>}<br/>{customer.address.city}, {customer.address.region} {customer.address.postalCode}<br/>{customer.address.country}</>:'Not provided'}</address></div>
        <button className={`${CTA_OUTLINE} mt-4`} onClick={()=>setEditing(customer)}>Edit contact details</button>
        {customer.deletion_request_id&&<div className="mt-4 rounded-xl border border-red-600 bg-red-50 p-4"><p className="font-bold text-red-800">Account deletion requested</p><p className="mt-1 text-sm">Delete access and personal profile data. Protected transaction history remains.</p><button disabled={saving} className="mt-3 rounded-full bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-50" onClick={()=>void remove(customer)}>{saving?'Deleting...':'Delete account'}</button></div>}
        {editing?.user_id===customer.user_id&&<form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={save}>
          <label>Full name<input name="name" required maxLength={100} defaultValue={customer.display_name||customer.address?.name||''} className={FIELD}/></label>
          <label>Email<input name="email" type="email" required defaultValue={customer.email||''} className={FIELD}/></label>
          <label>Phone<input name="phone" type="tel" defaultValue={customer.phone||''} className={FIELD}/></label>
          <label>WhatsApp number<input name="whatsapp" type="tel" pattern="\+[1-9][0-9]{7,14}" defaultValue={customer.whatsapp_number||''} className={FIELD}/></label>
          <label className="sm:col-span-2">Reason for correction (optional)<input name="reason" minLength={5} maxLength={500} className={FIELD}/></label>
          <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={saving} className={CTA}>{saving?'Saving…':'Save contact'}</button><button disabled={saving} type="button" className={CTA_OUTLINE} onClick={()=>setEditing(null)}>Cancel</button></div>
        </form>}
      </article>)}</div>
      <nav aria-label="Customer pages" className="mt-6 flex gap-3"><button className={CTA_OUTLINE} disabled={data.page<=1} onClick={()=>setPage(data.page-1)}>Previous</button><button className={CTA_OUTLINE} disabled={data.page>=data.pages} onClick={()=>setPage(data.page+1)}>Next</button></nav></>}
    </>}
  </section>
}
