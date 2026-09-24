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
    const durationMonths = Number(url.searchParams.get('duration'))
    const quantity = Number(url.searchParams.get('quantity'))
    const countryCode = (url.searchParams.get('country') ?? '').trim().toUpperCase().slice(0, 2)
    const discountCode = (url.searchParams.get('code') ?? '').trim().slice(0, 50)
    const quote = await calculatePricing(db, { durationMonths, quantity, countryCode, discountCode, now: Date.now() })
    return quote ? json({ quote }) : json({ error: 'This selection cannot be priced.' }, 422)
  } } },
})
