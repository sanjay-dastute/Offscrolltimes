import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { calculatePricing } from '#/lib/pricing.server'
import { allowRequest } from '#/lib/rate-limit.server'
import { json } from '#/lib/http.server'

export const Route = createFileRoute('/api/pricing')({
  server: { handlers: { GET: async ({ request }) => {
    if (!await allowRequest(request, 'public_pricing', 60, 10 * 60 * 1000)) return json({ error: 'Too many pricing requests.' }, 429)
    let db: D1Database
    try { db = lifecycleBindings().db } catch { return json({ error: 'Pricing is temporarily unavailable.' }, 503) }
    const url = new URL(request.url)
    if(url.searchParams.get('catalog')==='1'){
      const zones=await db.prepare(`SELECT country_code code,country_name name,currency FROM admin_shipping_zones WHERE active=1 ORDER BY country_name`).all<{code:string;name:string;currency:string}>()
      const detected=(request.headers.get('CF-IPCountry')??'').toUpperCase()
      const international=zones.results.filter(zone=>zone.currency!=='INR'&&zone.code!=='IN')
      const breakdown=await Promise.all(international.map(async zone=>{
        const quotes=await Promise.all([1,3,12].map(durationMonths=>calculatePricing(db,{durationMonths,quantity:1,countryCode:zone.code,now:Date.now()})))
        return { ...zone, quotes:quotes.filter((quote):quote is NonNullable<typeof quote>=>Boolean(quote)) }
      }))
      return json({countries:zones.results,internationalPricing:breakdown,detectedCountry:zones.results.some(zone=>zone.code===detected)?detected:null})
    }
    const durationMonths = Number(url.searchParams.get('duration'))
    const quantity = Number(url.searchParams.get('quantity'))
    const countryCode = (url.searchParams.get('country') ?? '').trim().toUpperCase().slice(0, 2)
    const discountCode = (url.searchParams.get('code') ?? '').trim().slice(0, 50)
    const quote = await calculatePricing(db, { durationMonths, quantity, countryCode, discountCode, now: Date.now() })
    return quote ? json({ quote }) : json({ error: 'This selection cannot be priced.' }, 422)
  } } },
})
