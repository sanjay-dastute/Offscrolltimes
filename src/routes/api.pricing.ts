import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { calculatePricing } from '#/lib/pricing.server'
import { allowRequest } from '#/lib/rate-limit.server'
import { json } from '#/lib/http.server'
import { readSession } from '#/lib/auth.server'

export const Route = createFileRoute('/api/pricing')({
  server: { handlers: { GET: async ({ request }) => {
    if (!await allowRequest(request, 'public_pricing', 60, 10 * 60 * 1000)) return json({ error: 'Too many pricing requests.' }, 429)
    let db: D1Database
    try { db = lifecycleBindings().db } catch { return json({ error: 'Pricing is temporarily unavailable.' }, 503) }
    const url = new URL(request.url)
    if(url.searchParams.get('catalog')==='1'){
      const zones=await db.prepare(`SELECT country_code code,country_name name,currency FROM admin_shipping_zones WHERE active=1 ORDER BY country_name`).all<{code:string;name:string;currency:string}>()
      const detected=(request.headers.get('CF-IPCountry')??'').toUpperCase()
      const session=await readSession(request)
      const referralEligible=session ? await db.prepare(`SELECT NOT EXISTS(SELECT 1 FROM customer_subscriptions s WHERE s.owner_id=? AND EXISTS(SELECT 1 FROM customer_payments p WHERE p.subscription_id=s.id AND p.status='paid')) AND NOT EXISTS(SELECT 1 FROM referral_redemptions WHERE referred_owner_id=?) eligible`).bind(session.user.id,session.user.id).first<{eligible:number}>() : null
      return json({countries:zones.results,detectedCountry:zones.results.some(zone=>zone.code===detected)?detected:null,referralEligible:session?referralEligible?.eligible===1:null})
    }
    const durationMonths = Number(url.searchParams.get('duration'))
    const quantity = Number(url.searchParams.get('quantity'))
    const countryCode = (url.searchParams.get('country') ?? '').trim().toUpperCase().slice(0, 2)
    const discountCode = (url.searchParams.get('code') ?? '').trim().slice(0, 50)
    const referralCode = (url.searchParams.get('referral') ?? '').trim().slice(0, 50)
    const session = await readSession(request)
    const quote = await calculatePricing(db, { durationMonths, quantity, countryCode, discountCode, referralCode, userId: session?.user.id, now: Date.now() })
    return quote ? json({ quote }) : json({ error: 'This selection cannot be priced.' }, 422)
  } } },
})
