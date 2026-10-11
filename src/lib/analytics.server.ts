import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { allowRequest } from '#/lib/rate-limit.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'
import { readSession } from '#/lib/auth.server'
import { base64url } from '#/lib/codec'

const browserEvents = new Set(['page_view','duration_selected','checkout_started'])
const clean = (value: unknown, max = 120) => typeof value === 'string' ? value.replace(/[?#].*$/, '').slice(0, max) : ''

export async function recordBrowserAnalytics(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Forbidden.' }, 403)
  const db = lifecycleBindings().db
  if (!await allowRequest(request, 'anonymous_analytics', 120, 60 * 60 * 1000)) return json({ error: 'Rate limited.' }, 429)
  const body = await request.json() as Record<string, unknown>
  const event = clean(body.event, 40)
  if (body.consent !== true || !browserEvents.has(event)) return json({ error: 'Consent or event invalid.' }, 422)
  if(typeof body.visitorId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.visitorId))return json({error:'A valid visitor identifier is required.'},422)
  const digest=async(value:string)=>base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${lifecycleBindings().lifecycleSecret}:${value}`))))
  const visitorKey=await digest(`device:${body.visitorId}`),session=await readSession(request),accountKey=session?await digest(`account:${session.user.id}`):null
  const geo=request.cf as {country?:string;region?:string;regionCode?:string}|undefined
  const country=geo?.country&&/^[A-Z]{2}$/.test(geo.country)?geo.country:null
  const region=geo?.region?.slice(0,100)||null,regionCode=geo?.regionCode?.slice(0,24)||null
  await db.prepare(`INSERT INTO analytics_visitors(device_key,account_key,country_code,region_name,region_code,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(device_key) DO UPDATE SET account_key=COALESCE(excluded.account_key,analytics_visitors.account_key)`).bind(visitorKey,accountKey,country,region,regionCode,Date.now()).run()
  const path = clean(body.path)
  const dimension = event === 'duration_selected' && /^(1|3|6|12)$/.test(String(body.value)) ? String(body.value) : null
  await db.prepare(`INSERT OR IGNORE INTO first_party_analytics_events(id,event_name,path,dimension_value,country_code,visitor_key,created_at) VALUES(?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(), event, path || null, dimension,country,visitorKey, Date.now()).run()
  return json({ ok: true })
}

export async function recordOperationalAnalytics(db: D1Database, event: 'payment_succeeded'|'payment_failed', country?: string) {
  await db.prepare(`INSERT INTO first_party_analytics_events(id,event_name,country_code,created_at) VALUES(?,?,?,?)`)
    .bind(crypto.randomUUID(), event, country?.slice(0, 2).toUpperCase() || null, Date.now()).run()
}

