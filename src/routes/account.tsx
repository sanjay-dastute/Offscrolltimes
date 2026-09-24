import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { CTA, CTA_OUTLINE, EYEBROW, H2 } from '#/lib/uiKit'
import { BUSINESS_DETAILS, CONTACT_EMAIL, CONTACT_HOURS, WHATSAPP_URL } from '#/content/site'
import type { CustomerAccountEvent, CustomerAddress, CustomerFulfilment, CustomerPayment, CustomerSubscription } from '#/lib/customer/store.server'
import { DamageEvidenceUpload } from '#/components/DamageEvidenceUpload'

type DashboardData = {
  user: { id: string; name?: string; username?: string; provider?: 'google'|'microsoft' }
  csrf: string
  identities: Array<{provider:'google'|'microsoft';provider_email:string|null;created_at:number}>
  subscriptions: CustomerSubscription[]
  payments: CustomerPayment[]
  fulfilments: CustomerFulfilment[]
  events: CustomerAccountEvent[]
}

const H1 = 'm-0 font-display text-[clamp(2.3rem,6vw,4.8rem)] font-bold leading-[0.95] tracking-[-0.04em]'

export const Route = createFileRoute('/account')({
  head: () => ({
    meta: [
      { title: 'My account | Offscroll Times' },
      { name: 'description', content: 'Manage your Offscroll Times subscription, delivery address, payments and dispatches.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AccountPage,
})

const emptyAddress: CustomerAddress = {
  name: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '',
}

function date(value: number | null) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : 'To be confirmed'
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value / 100)
}

function AccountPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthenticated, setUnauthenticated] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [address, setAddress] = useState<CustomerAddress>(emptyAddress)
  const [busy, setBusy] = useState(false)
  const [notice,setNotice]=useState('')
  const afterCutoff=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit'}).format(new Date()))>20

  async function load() {
    setLoading(true)
    const response = await fetch('/api/customer', { headers: { Accept: 'application/json' } })
    if (response.status === 401) {
      setUnauthenticated(true)
      setLoading(false)
      return
    }
    const result = await response.json() as DashboardData & { error?: string }
    if (!response.ok) setError(result.error ?? 'Your account could not be loaded.')
    else setData(result)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function action(subscriptionId: string, actionName: 'pause' | 'resume' | 'cancel') {
    if (!data || busy) return
    if (actionName === 'cancel' && !window.confirm('Cancel future service? Copies already paid for remain available under the cancellation policy.')) return
    setBusy(true); setError('')
    const response = await fetch('/api/customer', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: data.csrf, subscriptionId, action: actionName }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) setError(result.error ?? 'The subscription could not be updated.')
    else await load()
    setBusy(false)
  }

  async function saveAddress(event: React.FormEvent, subscriptionId: string) {
    event.preventDefault()
    if (!data || busy) return
    setBusy(true); setError('')
    const response = await fetch('/api/customer', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: data.csrf, subscriptionId, action: 'address', address }),
    })
    const result = await response.json() as { error?: string; effectiveAt?:number|null }
    if (!response.ok) setError(result.error ?? 'The address could not be updated.')
    else { setEditing(null); setNotice(result.effectiveAt?`Address saved. It applies from the ${new Intl.DateTimeFormat('en',{month:'long',year:'numeric'}).format(result.effectiveAt)} edition.`:'Address saved.'); await load() }
    setBusy(false)
  }

  async function privacy(actionName:'privacy.access'|'privacy.deletion') {if(!data||busy)return;if(actionName==='privacy.deletion'&&!window.confirm('Request account deletion? We must retain invoices and transaction records where legally required. Active paid-copy fulfilment will be reviewed before deletion.'))return;setBusy(true);const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:data.csrf,action:actionName})});const result=await response.json() as {error?:string;message?:string};setNotice(response.ok?(result.message??'Request received.'):(result.error??'Request failed.'));setBusy(false)}

  async function unlink(provider:'google'|'microsoft'){if(!data||busy||!window.confirm(`Remove ${provider} as a login method?`))return;setBusy(true);const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:data.csrf,action:'identity.unlink',provider})});const result=await response.json() as {error?:string};if(response.ok){setNotice(`${provider} was unlinked.`);await load()}else setError(result.error??'The login method could not be removed.');setBusy(false)}

  async function revokeAll(){if(!data||busy||!window.confirm('Sign out every device, including this one?'))return;setBusy(true);const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:data.csrf,action:'sessions.revoke_all'})});if(response.ok)location.href='/login';else{const result=await response.json() as {error?:string};setError(result.error??'Sessions could not be revoked.');setBusy(false)}}

  return <>
    <SiteHeader />
    <main id="main-content" className="mx-auto min-h-[65vh] max-w-[1180px] px-4 py-14 sm:px-6 lg:px-10">
      {loading && <p className="font-mono text-sm uppercase tracking-wider">Loading your account…</p>}
      {unauthenticated && <section className="mx-auto max-w-xl rounded-3xl border border-graphite bg-cream p-8 text-center">
        <p className={EYEBROW}>Customer account</p>
        <h1 className={`${H1} mt-3`}>Sign in to see your subscription.</h1>
        <p className="mt-4 text-graphite-soft">Your payment, delivery address and dispatch history are private to your account.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a className={CTA} href="/login">Sign in</a>
          <a className={CTA_OUTLINE} href="/register">Create account</a>
          <a className="w-full text-sm underline" href="/login">Trouble signing in? Choose Google or Microsoft</a>
        </div>
      </section>}
      {data && <>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-graphite pb-8">
          <div><p className={EYEBROW}>Profile & subscriptions</p><h1 className={`${H1} mt-2`}>Hello, {data.user.name ?? data.user.username ?? 'puzzle solver'}.</h1><p className="mt-3 text-graphite-soft">Manage your paid term, deliveries, address and account records.</p></div>
          <form method="post" action="/api/logout"><button className={CTA_OUTLINE} type="submit">Sign out</button></form>
        </div>
        {error && <p role="alert" className="mt-6 rounded-xl border border-red-700 bg-red-50 p-4 text-red-900">{error}</p>}
        {notice&&<p role="status" className="mt-6 rounded-xl border border-graphite bg-sun p-4">{notice}</p>}
        {data.subscriptions.length === 0 ? <section className="mt-10 rounded-3xl border border-graphite bg-sun/20 p-8">
          <h2 className={H2}>No subscription yet.</h2><p className="mt-3">Choose a duration and your subscription will appear here after checkout starts.</p>
          <a href="/subscription" className={`${CTA} mt-6 inline-flex`}>Choose a subscription</a>
        </section> : <div className="mt-10 grid gap-8">
          {data.subscriptions.map((subscription) => {
            const payments = data.payments.filter((item) => item.subscriptionId === subscription.id)
            const fulfilments = data.fulfilments.filter((item) => item.subscriptionId === subscription.id)
            const daysRemaining=subscription.paidThroughAt?Math.ceil((subscription.paidThroughAt-Date.now())/86400000):null
            return <article key={subscription.id} className="overflow-hidden rounded-3xl border border-graphite bg-paper shadow-[5px_5px_0_#26231f]">
              <div className="flex flex-wrap justify-between gap-5 border-b border-graphite bg-cream p-6">
                <div><p className={EYEBROW}>{subscription.status}</p><h2 className={`${H2} mt-2`}>{subscription.planName} subscription</h2><p className="mt-2">{subscription.durationMonths} months · {subscription.quantity} {subscription.quantity === 1 ? 'copy' : 'copies'} per edition</p></div>
                <div className="text-right"><strong className="text-xl">{money(subscription.amountMinor, subscription.currency)}</strong><p className="mt-1 text-sm text-graphite-soft">Paid term total</p></div>
              </div>
              <div className="grid gap-7 p-6 md:grid-cols-3">
                <section><h3 className="font-mono text-xs font-bold uppercase tracking-wider">Subscription</h3><dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-graphite-soft">Starts</dt><dd>{date(subscription.startsAt)}</dd></div><div><dt className="text-graphite-soft">Ends / paid through</dt><dd>{date(subscription.paidThroughAt??subscription.endsAt)}</dd></div><div><dt className="text-graphite-soft">Next expected edition</dt><dd>{subscription.nextDispatchAt?new Intl.DateTimeFormat('en',{month:'long',year:'numeric'}).format(subscription.nextDispatchAt):'To be confirmed'} · {date(subscription.nextDispatchAt)}</dd></div><div><dt className="text-graphite-soft">Copies remaining</dt><dd>{subscription.copiesRemaining} of {subscription.copiesTotal}</dd></div><div><dt className="text-graphite-soft">Paid entitlement</dt><dd className="capitalize">{subscription.entitlementStatus}</dd></div></dl></section>
                <section><h3 className="font-mono text-xs font-bold uppercase tracking-wider">Payment & invoices</h3>{payments.length ? <ul className="mt-3 grid gap-2 text-sm">{payments.map(payment => <li key={payment.id}><span className="capitalize">{payment.status}</span> · {money(payment.amountMinor, payment.currency)} · {date(payment.paidAt ?? payment.createdAt)}{payment.invoiceUrl && <> · <a href={payment.invoiceUrl}>Invoice</a></>}</li>)}</ul> : <p className="mt-3 text-sm text-graphite-soft">No payments recorded.</p>}</section>
                <section><h3 className="font-mono text-xs font-bold uppercase tracking-wider">Dispatch history</h3>{fulfilments.length ? <ul className="mt-3 grid gap-2 text-sm">{fulfilments.map(item => <li key={item.id}>{item.editionLabel} · <span className="capitalize">{item.status}</span>{item.courier&&<> · {item.courier}</>}{item.trackingUrl && <> · <a href={item.trackingUrl} target="_blank" rel="noopener noreferrer">Track</a></>}</li>)}</ul> : <p className="mt-3 text-sm text-graphite-soft">Your first dispatch will appear here.</p>}</section>
              </div>
              <div className="border-t border-rule p-6">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider">Delivery address</h3>
                <p className={`mt-2 text-sm ${afterCutoff?'text-founder-deep':'text-graphite-soft'}`}>{afterCutoff?'The 20th-day cut-off has passed. A new address can apply only to a later edition; contact support for the upcoming copy.':'Address changes saved by the 20th apply to the next monthly edition.'}</p>
                {editing === subscription.id ? <form onSubmit={(event) => void saveAddress(event, subscription.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
                  {([['name','Full name'],['line1','Address line 1'],['line2','Address line 2'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country code (IN, GB, DE…)']] as const).map(([key,label]) => <label key={key} className={key === 'line1' ? 'sm:col-span-2' : ''}><span className="mb-1 block text-sm">{label}</span><input required={!['line2','region'].includes(key)} maxLength={key === 'country' ? 2 : 160} value={address[key] ?? ''} onChange={event => setAddress(current => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-graphite bg-white px-3 py-2" /></label>)}
                  <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className={CTA} type="submit">Save address</button><button className={CTA_OUTLINE} type="button" onClick={() => setEditing(null)}>Cancel</button></div>
                </form> : <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><address className="not-italic text-sm leading-6">{subscription.deliveryAddress ? <>{subscription.deliveryAddress.name}<br />{subscription.deliveryAddress.line1}{subscription.deliveryAddress.line2 && <><br />{subscription.deliveryAddress.line2}</>}<br />{subscription.deliveryAddress.city}, {subscription.deliveryAddress.region} {subscription.deliveryAddress.postalCode}<br />{subscription.deliveryAddress.country}</> : 'Address will be added at checkout.'}</address><button className={CTA_OUTLINE} onClick={() => { setAddress(subscription.deliveryAddress ?? emptyAddress); setEditing(subscription.id) }}>Change address</button></div>}
              </div>
              <div className="flex flex-wrap gap-3 border-t border-graphite bg-cream p-6">
                {daysRemaining!==null&&daysRemaining>=0&&daysRemaining<=30&&<p className="w-full rounded-xl border border-graphite bg-sun p-3 text-sm"><strong>Your prepaid term ends in {daysRemaining} days.</strong> Renewal is manual; choose a new duration when you are ready.</p>}
                <details className="relative"><summary className={CTA}>Renew with a new duration</summary><div className="absolute bottom-full left-0 z-10 mb-2 grid min-w-52 gap-2 rounded-xl border border-graphite bg-paper p-3 shadow-lg">{[1,3,12].map(months=><a key={months} href={`/checkout/razorpay?duration=${months}&quantity=${subscription.quantity}&country=IN`} className="rounded-lg px-3 py-2 text-sm no-underline hover:bg-sun">{months} {months===1?'month':'months'}</a>)}</div></details>
                {subscription.status === 'paused' ? <button disabled={busy} className={CTA_OUTLINE} onClick={() => void action(subscription.id, 'resume')}>Resume</button> : <button disabled={busy || !['active','upcoming'].includes(subscription.status)} className={CTA_OUTLINE} onClick={() => void action(subscription.id, 'pause')}>Pause</button>}
                <button disabled={busy || ['cancelled','completed','refunded'].includes(subscription.status)} className={CTA_OUTLINE} onClick={() => void action(subscription.id, 'cancel')}>Cancel</button>
                <a className={CTA_OUTLINE} href="/contact?type=subscription">Contact support</a>
                <DamageEvidenceUpload subscriptionId={subscription.id} csrf={data.csrf}/>
                <a className={CTA_OUTLINE} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp support</a>
              </div>
            </article>
          })}
        </div>}
        <section className="mt-12 border-t border-graphite pt-8"><p className={EYEBROW}>Account activity</p><h2 className="text-2xl font-bold">Your status history</h2><p className="mt-2 max-w-2xl text-sm text-graphite-soft">Payment verification, subscription changes, address confirmations and delivery updates appear here. Private staff notes are never shown.</p><div className="mt-5 grid gap-3">{data.events.length?data.events.map(event=><article className="rounded-xl border border-rule bg-paper p-4" key={event.id}><div className="flex flex-wrap justify-between gap-2"><strong>{event.title}</strong><time className="text-sm text-graphite-soft">{date(event.createdAt)}</time></div><p className="mt-2 text-sm">{event.detail}</p>{event.effectiveAt&&<p className="mt-1 text-xs text-graphite-soft">Effective {date(event.effectiveAt)}</p>}</article>):<p className="text-sm text-graphite-soft">Activity will appear after checkout or an account update.</p>}</div></section>
        <section className="mt-12 rounded-2xl border border-graphite bg-cream p-6"><p className={EYEBROW}>Business and support</p><h2 className="text-2xl font-bold">Offscroll Times</h2><p className="mt-3 text-sm">{BUSINESS_DETAILS.location}<br/>{BUSINESS_DETAILS.registration}</p><p className="mt-3 text-sm"><a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br/>{CONTACT_HOURS.india}<br/>{CONTACT_HOURS.responseTime}</p></section>
        <section className="mt-12 border-t border-graphite pt-8"><p className={EYEBROW}>Login methods</p><h2 className="text-2xl font-bold">Connected identities</h2><p className="max-w-2xl text-sm text-graphite-soft">Link another provider only while signed in. Offscroll Times never merges separate accounts merely because their email addresses match.</p><div className="mt-4 flex flex-wrap gap-3">{(['google','microsoft'] as const).map(provider=>{const linked=data.identities.find(identity=>identity.provider===provider);return linked?<div key={provider} className="rounded-xl border border-graphite bg-paper p-3"><strong className="capitalize">{provider}</strong>{linked.provider_email&&<span className="ml-2 text-sm text-graphite-soft">{linked.provider_email}</span>}<button disabled={busy||data.identities.length<=1} className="ml-3 text-sm underline" onClick={()=>void unlink(provider)}>Unlink</button></div>:<a key={provider} className={CTA_OUTLINE} href={`/auth/${provider}/start?mode=link&return_to=/account`}>Link {provider}</a>})}</div><button disabled={busy} className={`${CTA_OUTLINE} mt-4`} onClick={()=>void revokeAll()}>Sign out all devices</button></section>
        <section className="mt-12 border-t border-graphite pt-8"><p className={EYEBROW}>Privacy controls</p><h2 className="text-2xl font-bold">Your account data</h2><p className="max-w-2xl text-sm text-graphite-soft">Request a copy of your account data or ask us to delete the profile data we are permitted to remove. Payment, invoice and tax records may need to be retained under applicable law.</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void privacy('privacy.access')}>Request my data</button><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void privacy('privacy.deletion')}>Request account deletion</button></div></section>
      </>}
    </main>
    <SiteFooter />
  </>
}
