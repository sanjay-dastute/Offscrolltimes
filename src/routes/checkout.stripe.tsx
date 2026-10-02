import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import type { CustomerAddress } from '#/lib/customer/store.server'
import { firstEditionDate,novemberLaunchTerm } from '#/lib/dates'

type State='form'|'creating'|'failed'
type Quote={currency:string;subtotalMinor:number;durationDiscountMinor:number;offerDiscountMinor:number;shippingMinor:number;taxMinor:number;totalMinor:number}
const money=(minor:number,currency:string)=>new Intl.NumberFormat('en',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(minor/100)

export const Route=createFileRoute('/checkout/stripe')({validateSearch:(s:Record<string,unknown>)=>({duration:Math.max(1,Number(s.duration??1)||1),quantity:Math.max(1,Number(s.quantity??1)||1),country:typeof s.country==='string'?s.country:'IN',code:typeof s.code==='string'?s.code:''}),component:StripePage})

function StripePage(){
  const search=Route.useSearch(),[state,setState]=useState<State>('form'),[error,setError]=useState(''),[csrf,setCsrf]=useState(''),[quote,setQuote]=useState<Quote|null>(null),[renewalQuote,setRenewalQuote]=useState<Quote|null>(null)
  const [savedAddress,setSavedAddress]=useState<CustomerAddress|null>(null),[profile,setProfile]=useState<{display_name?:string;email?:string;phone?:string;whatsapp_number?:string}|null>(null)
  const idempotencyKey=useRef(crypto.randomUUID())
  const [billingToday,setBillingToday]=useState<Date|null>(null)
  useEffect(()=>setBillingToday(new Date()),[])
  const term=search.duration===1?'month':'months'
  const billingParts=billingToday?new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Kolkata'}).formatToParts(billingToday):[]
  const billingPart=(type:string)=>Number(billingParts.find(part=>part.type===type)?.value)
  const launchTerm=billingToday?novemberLaunchTerm(billingToday.getTime(),search.duration):null
  const nextCharge=billingToday?new Date(Date.UTC(billingPart('year'),billingPart('month')-1,billingPart('day'))):null
  if(nextCharge&&launchTerm)nextCharge.setTime(launchTerm.end)
  if(nextCharge&&!launchTerm){const day=nextCharge.getUTCDate();nextCharge.setUTCDate(1);nextCharge.setUTCMonth(nextCharge.getUTCMonth()+search.duration);const lastDay=new Date(Date.UTC(nextCharge.getUTCFullYear(),nextCharge.getUTCMonth()+1,0)).getUTCDate();nextCharge.setUTCDate(Math.min(day,lastDay))}
  const dateLabel=(date:Date)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(date)

  useEffect(()=>{
    const controller=new AbortController()
    void fetch('/api/session',{signal:controller.signal}).then(async response=>await response.json() as {csrf?:string}).then(result=>setCsrf(result.csrf??'')).catch(()=>{})
    void fetch('/api/customer',{signal:controller.signal}).then(async response=>response.ok?response.json() as Promise<{address?:CustomerAddress;profile?:{display_name?:string;email?:string;phone?:string;whatsapp_number?:string}}>:null).then(data=>{if(data){setSavedAddress(data.address??null);setProfile(data.profile??null)}}).catch(()=>{})
    const params=new URLSearchParams({duration:String(search.duration),quantity:String(search.quantity),country:search.country})
    async function load(){try{const renewalResponse=await fetch(`/api/pricing?${params}`,{signal:controller.signal});const renewal=await renewalResponse.json() as {quote?:Quote;error?:string};if(!renewalResponse.ok||!renewal.quote)throw new Error(renewal.error??'Pricing unavailable.');setRenewalQuote(renewal.quote);if(search.code)params.set('code',search.code);const response=await fetch(`/api/pricing?${params}`,{signal:controller.signal});const result=await response.json() as {quote?:Quote;error?:string};if(!response.ok||!result.quote)throw new Error(result.error??'Pricing unavailable.');setQuote(result.quote)}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Pricing unavailable.')}}
    void load();return()=>controller.abort()
  },[search.duration,search.quantity,search.country,search.code])

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!csrf){location.href=`/login?returnTo=${encodeURIComponent(location.pathname+location.search)}`;return}
    setState('creating');setError('');const f=new FormData(event.currentTarget)
    const address=savedAddress?savedAddress:{name:f.get('name'),line1:f.get('line1'),line2:f.get('line2'),city:f.get('city'),region:f.get('region'),postalCode:f.get('postalCode'),country:f.get('country')}
    try{const response=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf,idempotencyKey:idempotencyKey.current,durationMonths:search.duration,quantity:search.quantity,discountCode:search.code,email:f.get('email'),whatsapp:f.get('phone'),phone:f.get('phone'),useProfileAddress:Boolean(savedAddress),address,acceptTerms:f.get('terms')==='on'})});const result=await response.json() as {url?:string;error?:string};if(!response.ok||!result.url)throw new Error(result.error??'Checkout unavailable.');location.assign(result.url)}catch(error){setError(error instanceof Error?error.message:'Checkout failed.');setState('failed')}
  }

  return <><SiteHeader/><main className="checkout-page mx-auto max-w-6xl px-4 py-10 md:py-14"><p className="checkout-eyebrow">Payment</p><h1 className="checkout-title">Review &amp; pay</h1><div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
    <form id="subscription-payment-form" onSubmit={submit} className="grid content-start gap-5 rounded-3xl border border-graphite/20 bg-paper-raised p-5 shadow-sm md:grid-cols-2 md:p-8"><div className="md:col-span-2"><p className="font-mono text-xs uppercase tracking-widest text-graphite-soft">Delivery details</p><h2 className="mt-2 text-2xl font-bold">Where should we send your issues?</h2><p className="mt-2 text-sm text-graphite-soft">Enter your contact details and delivery address.</p></div><label className="grid min-w-0 gap-2"><span className="text-sm font-semibold">Full name</span><input required name="name" defaultValue={profile?.display_name??savedAddress?.name??''} placeholder="Full name" autoComplete="name" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2"><span className="text-sm font-semibold">Email</span><input required name="email" defaultValue={profile?.email??''} type="email" placeholder="Email" autoComplete="email" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2 md:col-span-2"><span className="text-sm font-semibold">WhatsApp number</span><input required type="tel" name="phone" defaultValue={profile?.whatsapp_number||profile?.phone||''} placeholder="WhatsApp number" autoComplete="tel" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label>{savedAddress?<section className="rounded-xl border border-graphite/20 bg-paper p-4 md:col-span-2"><h3 className="font-bold">Deliver to your profile address</h3><address className="mt-2 not-italic text-sm leading-relaxed">{savedAddress.name}<br/>{savedAddress.line1}{savedAddress.line2&&<><br/>{savedAddress.line2}</>}<br/>{savedAddress.city}, {savedAddress.region} {savedAddress.postalCode}<br/>{savedAddress.country}</address><a href="/account" className="mt-3 inline-block text-sm underline">Change your default address in profile</a></section>:<><label className="grid min-w-0 gap-2 md:col-span-2"><span className="text-sm font-semibold">Address line 1</span><input required name="line1" placeholder="Address line 1" autoComplete="address-line1" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2 md:col-span-2"><span className="text-sm font-semibold">Address line 2 (optional)</span><input name="line2" placeholder="Address line 2 (optional)" autoComplete="address-line2" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2"><span className="text-sm font-semibold">City / town</span><input required name="city" placeholder="City / town" autoComplete="address-level2" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2"><span className="text-sm font-semibold">State / region</span><input required name="region" placeholder="State / region" autoComplete="address-level1" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2"><span className="text-sm font-semibold">PIN code</span><input required name="postalCode" placeholder="PIN code" autoComplete="postal-code" className="h-12 w-full min-w-0 rounded-xl border border-graphite/25 bg-paper px-4 text-base outline-none transition focus:border-graphite focus:ring-2 focus:ring-sun"/></label><label className="grid min-w-0 gap-2"><span className="text-sm font-semibold">Country</span><select required name="country" defaultValue="IN" autoComplete="country" className="h-12 w-full rounded-xl border border-graphite/25 bg-paper px-4"><option value="IN">India</option></select></label></>}</form>
    <aside className="checkout-review order-first lg:order-last">
      <div className="checkout-plan-card">
        <h2 className="checkout-plan-title">{search.duration} {term} plan</h2>
        {launchTerm&&<p className="mt-2 font-semibold">Subscription starts on {dateLabel(new Date(launchTerm.start))}.</p>}
        {billingToday&&<p className="mt-2 font-semibold">First issue expected to dispatch on {dateLabel(launchTerm?new Date(launchTerm.dispatch):firstEditionDate(billingToday))}.</p>}
        {renewalQuote&&<p className="checkout-plan-price">{money(renewalQuote.totalMinor/search.duration,renewalQuote.currency)}/month &middot; <span>{search.duration*search.quantity} {search.duration*search.quantity===1?'issue':'issues'} every {search.duration} {term}</span> &middot; <span>{renewalQuote.shippingMinor===0?'Free delivery':'Delivery included'}</span></p>}
        <p className="checkout-renew-badge">AUTO-RENEWS</p>
      </div>
      <dl className="checkout-totals">
        {search.quantity>1&&<div className="flex justify-between gap-3"><dt>Copies per edition</dt><dd>{search.quantity}</dd></div>}
        {quote&&<>
          <div className="flex justify-between gap-3"><dt>{search.duration*search.quantity} {search.duration*search.quantity===1?'issue':'issues'} in this term</dt><dd>{money(quote.subtotalMinor,quote.currency)}</dd></div>
          {quote.durationDiscountMinor+quote.offerDiscountMinor>0&&<div className="flex justify-between gap-3"><dt>Discount</dt><dd>-{money(quote.durationDiscountMinor+quote.offerDiscountMinor,quote.currency)}</dd></div>}
          <div className="flex justify-between gap-3"><dt>Delivery</dt><dd className="checkout-green">{quote.shippingMinor===0?'Free':money(quote.shippingMinor,quote.currency)}</dd></div>
          {quote.taxMinor>0&&<div className="flex justify-between gap-3"><dt>Tax</dt><dd>{money(quote.taxMinor,quote.currency)}</dd></div>}
          <div className="checkout-payable"><dt>PAYABLE TODAY</dt><dd className="checkout-green">{money(quote.totalMinor,quote.currency)}</dd></div>
        </>}
      </dl>
      {quote&&renewalQuote&&<div className="checkout-charge-notice">
        <p><svg aria-hidden="true" viewBox="0 0 24 16" className="mr-2 inline-block h-4 w-6 text-teal-deep" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="1" width="22" height="14" rx="2"/><path d="M1 5h22M4 11h5"/></svg>{money(quote.totalMinor,quote.currency)} charged today</p>
        <p className="mt-2">Next charge: {money(renewalQuote.totalMinor,renewalQuote.currency)}{nextCharge?` on ${dateLabel(nextCharge)}`:''}, then every {search.duration} {term} until you cancel.</p>
      </div>}
      <label className="checkout-consent"><input form="subscription-payment-form" required name="terms" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-graphite"/><span>I authorise automatic renewal every {search.duration} {search.duration===1?'month':'months'} until cancelled, and accept the <a className="underline underline-offset-2" href="/policies/subscription">subscription terms</a>, <a className="underline underline-offset-2" href="/policies/refund">cancellation policy</a> and <a className="underline underline-offset-2" href="/policies/privacy">privacy policy</a>.</span></label><button form="subscription-payment-form" type="submit" disabled={state==='creating'||!quote||!renewalQuote} className="checkout-start-button">{state==='creating'?'Creating subscription...':'Start subscription'}</button>{error&&<p role="alert" className="text-red-700 md:col-span-2">{error}</p>}{state==='failed'&&<button type="button" onClick={()=>setState('form')} className="underline md:col-span-2">Return and retry safely</button>}
      <p className="mt-4 text-sm">The full {search.duration}-month term is paid upfront. The monthly amount is a price breakdown; you are charged once every {search.duration} {term}. Cancel before renewal to stop the next charge.</p>
      {quote&&renewalQuote&&quote.totalMinor!==renewalQuote.totalMinor&&<p className="mt-3 text-sm">Your first-term offer applies today only. Renewals use the regular amount shown above.</p>}
      <p className="mt-3 text-xs text-graphite-soft">Your payment is collected today. October launch subscriptions start on 1 November 2026 and renew after the selected term. Stripe confirms your next charge date.</p>
    </aside>
  </div></main><SiteFooter/></>
}
