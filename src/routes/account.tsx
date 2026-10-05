import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { CTA, CTA_OUTLINE, EYEBROW, H2 } from '#/lib/uiKit'
import { BUSINESS_DETAILS, CONTACT_EMAIL, CONTACT_HOURS, WHATSAPP_URL } from '#/content/site'
import type { CustomerAccountEvent, CustomerAddress, CustomerFulfilment, CustomerPayment, CustomerSubscription } from '#/lib/customer/store.server'
import { DamageEvidenceUpload } from '#/components/DamageEvidenceUpload'
import { AccountContact, type ContactProfile } from '#/components/AccountContact'
import { AccountDeliveryAddress } from '#/components/AccountDeliveryAddress'

type DashboardData = {
  profileComplete?: boolean
  user: { id: string; name?: string; username?: string; provider?: 'google'|'microsoft' }
  csrf: string
  profile: ContactProfile | null
  address: CustomerAddress | null
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

function date(value: number | null) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : 'To be confirmed'
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value / 100)
}

function AccountPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthenticated, setUnauthenticated] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice,setNotice]=useState('')


  async function load() {
    setLoading(true)
    setError('')
    try {
    const response = await fetch('/api/customer', { headers: { Accept: 'application/json' } })
    if (response.status === 401) {
      setUnauthenticated(true)
      setLoading(false)
      return
    }
    const result = await response.json() as DashboardData & { error?: string }
    if (!response.ok) setError(result.error ?? 'Your account could not be loaded.')
    else if(result.profileComplete===false) { window.location.assign('/complete-profile?returnTo=%2Faccount') }
    else { setData(result); setUnauthenticated(false) }
    } catch { setError('Your profile could not be loaded. Check your connection and retry.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  useEffect(()=>{
    if(new URLSearchParams(location.search).get('checkout')!=='success')return
    const controller=new AbortController();let attempts=0
    const timer=setInterval(()=>{
      if(++attempts>6){clearInterval(timer);return}
      void fetch('/api/customer',{headers:{Accept:'application/json'},signal:controller.signal}).then(async response=>{
        if(!response.ok)return
        const result=await response.json() as DashboardData
        setData(result)
        if(result.subscriptions.some(subscription=>subscription.entitlementStatus==='paid'))clearInterval(timer)
      }).catch(()=>{})
    },20000)
    return()=>{clearInterval(timer);controller.abort()}
  },[])

  async function action(subscriptionId: string, actionName: 'refund') {
    if (!data || busy) return
    if (!window.confirm('Request a full refund to the original payment method? This is available only within 48 hours of payment.')) return
    setBusy(true); setError('')
    try {
    const response = await fetch('/api/customer', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: data.csrf, subscriptionId, action: actionName }),
    })
    const result = await response.json() as { error?: string;message?:string }
    if (!response.ok) setError(result.error ?? 'The subscription could not be updated.')
    else {setNotice(result.message??'Subscription updated.');await load()}
    } catch { setError('Your subscription could not be updated. Check your connection and retry.') }
    finally { setBusy(false) }
  }

  async function privacy(actionName:'privacy.access'|'privacy.deletion') {if(!data||busy)return;if(actionName==='privacy.deletion'&&!window.confirm('Request account deletion? We must retain invoices and transaction records where legally required. Active paid-copy fulfilment will be reviewed before deletion.'))return;setBusy(true);const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:data.csrf,action:actionName})});const result=await response.json() as {error?:string;message?:string};setNotice(response.ok?(result.message??'Request received.'):(result.error??'Request failed.'));setBusy(false)}


  async function revokeAll(){if(!data||busy||!window.confirm('Sign out every device, including this one?'))return;setBusy(true);const response=await fetch('/api/customer',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:data.csrf,action:'sessions.revoke_all'})});if(response.ok)location.href='/login';else{const result=await response.json() as {error?:string};setError(result.error??'Sessions could not be revoked.');setBusy(false)}}

  return <>
    <SiteHeader />
    <main id="main-content" className="mx-auto min-h-[65vh] max-w-[1180px] px-4 py-14 sm:px-6 lg:px-10">
      {error && <div role="alert" className="mb-6 rounded-xl border border-red-700 bg-red-50 p-4 text-red-900"><p>{error}</p><button type="button" className={`${CTA_OUTLINE} mt-3`} onClick={()=>void load()}>Retry loading profile</button></div>}
      {loading && <p className="font-mono text-sm uppercase tracking-wider">Loading your account…</p>}
      {unauthenticated && <section className="mx-auto max-w-xl rounded-3xl border border-graphite bg-cream p-8 text-center">
        <p className={EYEBROW}>Customer account</p>
        <h1 className={`${H1} mt-3`}>Your profile, in one place.</h1>
        <p className="mt-4 text-graphite-soft">Sign in to edit your name, phone, email and delivery address, manage your subscription, and view payments and receipts.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a className={CTA} href="/login?returnTo=/account">Sign in to my profile</a>
          <a className={CTA_OUTLINE} href="/register?returnTo=/account">Create account</a>
          <a className="w-full text-sm underline" href="/login">Trouble signing in? Choose Google</a>
        </div>
      </section>}
      {data && <>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-graphite pb-8">
          <div><p className={EYEBROW}>My profile</p><h1 className={`${H1} mt-2`}>Hello, {data.profile?.display_name || data.user.name || data.user.username || 'puzzle solver'}.</h1><p className="mt-3 text-graphite-soft">Edit your name, phone and email, update delivery addresses, and view subscriptions, payments and receipts.</p></div>
          <form method="post" action="/api/logout"><button className={CTA_OUTLINE} type="submit">Sign out</button></form>
        </div>
        {notice&&<p role="status" className="mt-6 rounded-xl border border-graphite bg-sun p-4">{notice}</p>}
        {data.subscriptions.length === 0 ? <section className="mt-10 rounded-3xl border border-graphite bg-sun/20 p-8">
          <h2 className={H2}>No subscription yet.</h2><p className="mt-3">Choose a duration and your subscription will appear here after checkout starts.</p>
          <a href="/subscription" className={`${CTA} mt-6 inline-flex`}>Choose a subscription</a>
        </section> : <div className="mt-10 grid gap-8">
          {data.subscriptions.map((subscription) => {
            const payments = data.payments.filter((item) => item.subscriptionId === subscription.id)
            const fulfilments = data.fulfilments.filter((item) => item.subscriptionId === subscription.id)
            const latestPayment=[...payments].filter(payment=>payment.paidAt).sort((a,b)=>(b.paidAt??0)-(a.paidAt??0))[0]
            const canRefund=latestPayment?.status==='paid'&&subscription.status!=='refunded'&&Boolean(latestPayment.paidAt&&Date.now()-latestPayment.paidAt<=48*60*60*1000)
            const daysRemaining=subscription.paidThroughAt?Math.ceil((subscription.paidThroughAt-Date.now())/86400000):null
            return <article key={subscription.id} className="overflow-hidden rounded-3xl border border-graphite bg-paper shadow-[5px_5px_0_#26231f]">
              <div className="flex flex-wrap justify-between gap-5 border-b border-graphite bg-cream p-6">
                <div><p className={EYEBROW}>{subscription.status}</p><h2 className={`${H2} mt-2`}>{subscription.planName} subscription</h2><p className="mt-2">{subscription.durationMonths} months · {subscription.quantity} {subscription.quantity === 1 ? 'copy' : 'copies'} per edition</p></div>
                <div className="text-right"><strong className="text-xl">{money(subscription.amountMinor, subscription.currency)}</strong><p className="mt-1 text-sm text-graphite-soft">Paid term total</p></div>
              </div>
              <div className="grid gap-7 p-6 md:grid-cols-3">
                <section><h3 className="font-mono text-xs font-bold uppercase tracking-wider">Subscription</h3><dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-graphite-soft">Starts</dt><dd>{date(subscription.startsAt)}</dd></div><div><dt className="text-graphite-soft">Ends / paid through</dt><dd>{date(subscription.paidThroughAt??subscription.endsAt)}</dd></div><div><dt className="text-graphite-soft">Next expected edition</dt><dd>{subscription.nextDispatchAt?new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(subscription.nextDispatchAt):'To be confirmed'} · {date(subscription.nextDispatchAt)}</dd></div><div><dt className="text-graphite-soft">Copies remaining</dt><dd>{subscription.copiesRemaining} of {subscription.copiesTotal}</dd></div><div><dt className="text-graphite-soft">Paid entitlement</dt><dd className="capitalize">{subscription.entitlementStatus}</dd></div></dl></section>
                <section><h3 className="font-mono text-xs font-bold uppercase tracking-wider">Payment & invoices</h3>{payments.length ? <ul className="mt-3 grid gap-2 text-sm">{payments.map(payment => <li key={payment.id}><span className="capitalize">{payment.status}</span> · {money(payment.amountMinor, payment.currency)} · {date(payment.paidAt ?? payment.createdAt)}{payment.refundStatus&&<span className="block font-semibold">Refund: {payment.refundStatus}</span>}{payment.invoiceUrl && <> · <a href={payment.invoiceUrl}>Invoice</a></>}</li>)}</ul> : <p className="mt-3 text-sm text-graphite-soft">No payments recorded.</p>}</section>
                <section><h3 className="font-mono text-xs font-bold uppercase tracking-wider">Dispatch history</h3>{fulfilments.length ? <ul className="mt-3 grid gap-2 text-sm">{fulfilments.map(item => <li key={item.id}>{item.editionLabel} · <span className="capitalize">{item.status}</span>{item.courier&&<> · {item.courier}</>}{item.trackingUrl && <> · <a href={item.trackingUrl} target="_blank" rel="noopener noreferrer">Track</a></>}</li>)}</ul> : <p className="mt-3 text-sm text-graphite-soft">Your first dispatch will appear here.</p>}</section>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-graphite bg-cream p-6">
                {daysRemaining!==null&&daysRemaining>=0&&daysRemaining<=30&&<p className="w-full rounded-xl border border-graphite bg-sun p-3 text-sm"><strong>Your prepaid term ends in {daysRemaining} days.</strong> Choose a new term before the final paid edition if you would like to continue.</p>}
                <div className="w-full"><button disabled={busy||!canRefund} className={`${CTA_OUTLINE} disabled:cursor-not-allowed disabled:opacity-40`} onClick={()=>void action(subscription.id,'refund')}>Request full refund</button><p className="mt-2 text-sm">{latestPayment?.status==='refunded'?'This payment has been refunded.':canRefund?'Full refunds are available for 48 hours after payment.':'The 48-hour full-refund window has closed.'}</p></div>
                <a className={CTA_OUTLINE} href="/contact?type=subscription">Contact support</a>
                <DamageEvidenceUpload subscriptionId={subscription.id} csrf={data.csrf}/>
                <a className={CTA_OUTLINE} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp support</a>
              </div>
            </article>
          })}
        </div>}
        <section className="mt-12 rounded-3xl border border-graphite bg-paper p-6 md:p-8"><h2 className="text-2xl font-bold">Personal details and delivery</h2><AccountContact profile={data.profile} csrf={data.csrf} onSaved={load} embedded/><AccountDeliveryAddress address={data.address??data.subscriptions.find(subscription=>subscription.deliveryAddress)?.deliveryAddress??null} csrf={data.csrf} onSaved={load} embedded/></section>
        <section className="mt-12 border-t border-graphite pt-8"><p className={EYEBROW}>Account activity</p><h2 className="text-2xl font-bold">Your status history</h2><p className="mt-2 max-w-2xl text-sm text-graphite-soft">Payment verification, subscription changes, address confirmations and delivery updates appear here. Private staff notes are never shown.</p><div className="mt-5 grid gap-3">{data.events.length?data.events.map(event=><article className="rounded-xl border border-rule bg-paper p-4" key={event.id}><div className="flex flex-wrap justify-between gap-2"><strong>{event.title}</strong><time className="text-sm text-graphite-soft">{date(event.createdAt)}</time></div><p className="mt-2 text-sm">{event.detail}</p>{event.effectiveAt&&<p className="mt-1 text-xs text-graphite-soft">Effective {date(event.effectiveAt)}</p>}</article>):<p className="text-sm text-graphite-soft">Activity will appear after checkout or an account update.</p>}</div></section>
        <section className="mt-12 rounded-2xl border border-graphite bg-cream p-6"><p className={EYEBROW}>Business and support</p><h2 className="text-2xl font-bold">Offscroll Times</h2><p className="mt-3 text-sm">{BUSINESS_DETAILS.location}</p><p className="mt-3 text-sm"><a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br/>{CONTACT_HOURS.india}<br/>{CONTACT_HOURS.responseTime}</p></section>
        <section className="mt-12 border-t border-graphite pt-8"><p className={EYEBROW}>Login methods</p><h2 className="text-2xl font-bold">Connected identities</h2><p className="max-w-2xl text-sm text-graphite-soft">Google is your account sign-in method. Your password stays with Google.</p><div className="mt-4 flex flex-wrap gap-3">{(['google'] as const).map(provider=>{const linked=data.identities.find(identity=>identity.provider===provider);return linked?<div key={provider} className="rounded-xl border border-graphite bg-paper p-3"><strong className="capitalize">{provider}</strong>{linked.provider_email&&<span className="ml-2 text-sm text-graphite-soft">{linked.provider_email}</span>}</div>:<a key={provider} className={CTA_OUTLINE} href={`/auth/${provider}/start?mode=link&return_to=/account`}>Link {provider}</a>})}</div><button disabled={busy} className={`${CTA_OUTLINE} mt-4`} onClick={()=>void revokeAll()}>Sign out all devices</button></section>
        <section className="mt-12 border-t border-graphite pt-8"><p className={EYEBROW}>Privacy controls</p><h2 className="text-2xl font-bold">Your account data</h2><p className="max-w-2xl text-sm text-graphite-soft">Request a copy of your account data or ask us to delete the profile data we are permitted to remove. Payment, invoice and tax records may need to be retained under applicable law.</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void privacy('privacy.access')}>Request my data</button><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void privacy('privacy.deletion')}>Request account deletion</button></div></section>
      </>}
    </main>
    <SiteFooter />
  </>
}
