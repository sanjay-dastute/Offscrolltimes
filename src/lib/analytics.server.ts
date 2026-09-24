import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { allowRequest } from '#/lib/rate-limit.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'

const browserEvents = new Set(['page_view','duration_selected','checkout_started'])
const clean = (value: unknown, max = 120) => typeof value === 'string' ? value.replace(/[?#].*$/, '').slice(0, max) : ''

export async function recordBrowserAnalytics(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Forbidden.' }, 403)
  const db = lifecycleBindings().db
  if (!await allowRequest(request, 'anonymous_analytics', 120, 60 * 60 * 1000)) return json({ error: 'Rate limited.' }, 429)
  const body = await request.json() as Record<string, unknown>
  const event = clean(body.event, 40)
  if (body.consent !== true || !browserEvents.has(event)) return json({ error: 'Consent or event invalid.' }, 422)
  const path = clean(body.path)
  const dimension = event === 'duration_selected' && /^(1|3|6|12)$/.test(String(body.value)) ? String(body.value) : null
  await db.prepare(`INSERT INTO first_party_analytics_events(id,event_name,path,dimension_value,created_at) VALUES(?,?,?,?,?)`)
    .bind(crypto.randomUUID(), event, path || null, dimension, Date.now()).run()
  return json({ ok: true })
}

export async function recordOperationalAnalytics(db: D1Database, event: 'payment_succeeded'|'payment_failed', country?: string) {
  await db.prepare(`INSERT INTO first_party_analytics_events(id,event_name,country_code,created_at) VALUES(?,?,?,?)`)
    .bind(crypto.randomUUID(), event, country?.slice(0, 2).toUpperCase() || null, Date.now()).run()
}

