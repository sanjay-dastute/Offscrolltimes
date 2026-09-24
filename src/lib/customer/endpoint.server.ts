import { readSession } from '#/lib/auth.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { recordAddressVersion } from '#/lib/canonical-data.server'
import {
  listCustomerSubscriptions,
  requestCustomerAction,
  updateCustomerAddress,
  createPrivacyRequest,
  type CustomerAddress,
} from './store.server'

const SUBSCRIPTION_ID = /^[A-Za-z0-9_-]{6,160}$/
const COUNTRY = /^[A-Z]{2}$/

function customerDb(): D1Database | null {
  try {
    return lifecycleBindings().db
  } catch {
    return null
  }
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validAddress(value: unknown): CustomerAddress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const address: CustomerAddress = {
    name: cleanText(raw.name, 100),
    line1: cleanText(raw.line1, 160),
    line2: cleanText(raw.line2, 160) || undefined,
    city: cleanText(raw.city, 100),
    region: cleanText(raw.region, 100) || undefined,
    postalCode: cleanText(raw.postalCode, 24),
    country: cleanText(raw.country, 2).toUpperCase(),
  }
  if (!address.name || !address.line1 || !address.city || !address.postalCode || !COUNTRY.test(address.country)) {
    return null
  }
  return address
}

async function authenticated(request: Request) {
  const session = await readSession(request)
  if (!session) return null
  return session
}

export async function getCustomerDashboard(request: Request): Promise<Response> {
  const session = await authenticated(request)
  if (!session) return json({ error: 'Sign in to view your account.' }, 401)
  const db = customerDb()
  if (!db) return json({ error: 'Customer accounts are temporarily unavailable.' }, 503)
  const data = await listCustomerSubscriptions(db, session.user.id)
  const identities = session.internalUserId
    ? await db.prepare(`SELECT provider,provider_email,created_at FROM auth_identities WHERE user_id=? ORDER BY created_at`).bind(session.internalUserId).all<{provider:string;provider_email:string|null;created_at:number}>()
    : { results: [] }
  return json({ user: session.user, csrf: session.csrf, identities: identities.results, ...data })
}

export async function patchCustomerDashboard(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: 'Forbidden.' }, 403)
  const session = await authenticated(request)
  if (!session) return json({ error: 'Sign in to manage your account.' }, 401)
  const db = customerDb()
  if (!db) return json({ error: 'Customer accounts are temporarily unavailable.' }, 503)
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'Invalid request.' }, 400) }
  if (body.csrf !== session.csrf) return json({ error: 'Your session changed. Refresh and retry.' }, 403)
  if(body.action==='identity.unlink'){
    if(!session.internalUserId)return json({error:'Account linking is unavailable for this session.'},409)
    const provider=cleanText(body.provider,20)
    if(provider!=='google'&&provider!=='microsoft')return json({error:'Invalid identity provider.'},400)
    const identities=await db.prepare(`SELECT id,provider_subject FROM auth_identities WHERE user_id=?`).bind(session.internalUserId).all<{id:string;provider_subject:string}>()
    const target=await db.prepare(`SELECT id,provider_subject FROM auth_identities WHERE user_id=? AND provider=?`).bind(session.internalUserId,provider).first<{id:string;provider_subject:string}>()
    if(!target)return json({error:'That provider is not linked.'},404)
    if(identities.results.length<=1)return json({error:'You must keep at least one login method.'},409)
    const now=Date.now();const summary=JSON.stringify({provider,outcome:'unlinked'})
    await db.prepare(`DELETE FROM auth_identities WHERE id=?`).bind(target.id).run()
    await db.prepare(`INSERT INTO identity_security_events(id,actor_user_id,action,provider,provider_subject,summary_json,created_at) VALUES(?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),session.internalUserId,'identity_unlinked',provider,target.provider_subject,summary,now).run()
    await db.prepare(`INSERT INTO admin_audit_log(id,actor_user_id,action,target_type,target_id,summary_json,created_at) VALUES(?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),session.internalUserId,'identity.unlinked','user',session.internalUserId,summary,now).run()
    return json({ok:true})
  }
  if(body.action==='sessions.revoke_all'){
    if(!session.internalUserId)return json({error:'Session management is unavailable for this account.'},409)
    const now=Date.now()
    await db.prepare(`UPDATE application_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL`).bind(now,session.internalUserId).run()
    await db.prepare(`INSERT INTO identity_security_events(id,actor_user_id,action,summary_json,created_at) VALUES(?,?,?,?,?)`).bind(crypto.randomUUID(),session.internalUserId,'sessions_revoked',JSON.stringify({scope:'all'}),now).run()
    return json({ok:true,signedOut:true})
  }
  if(body.action==='privacy.access'||body.action==='privacy.deletion'){
    const requestType=body.action==='privacy.access'?'access':'deletion'
    const id=await createPrivacyRequest(db,session.user.id,requestType,Date.now())
    await db.prepare(`UPDATE customers SET privacy_request_state=?,updated_at=? WHERE user_id=(SELECT id FROM users WHERE owner_id=?)`).bind(requestType==='deletion'?'deletion_requested':'access_requested',Date.now(),session.user.id).run()
    if(requestType==='deletion')await db.prepare(`UPDATE users SET account_state='deletion_requested',updated_at=? WHERE owner_id=?`).bind(Date.now(),session.user.id).run()
    return json({ok:true,id,message:id==='existing'?'A matching request is already being reviewed.':'Your request has been received.'})
  }
  const subscriptionId = cleanText(body.subscriptionId, 160)
  if (!SUBSCRIPTION_ID.test(subscriptionId)) return json({ error: 'Invalid subscription.' }, 400)
  if (body.action === 'address') {
    const address = validAddress(body.address)
    if (!address) return json({ error: 'Enter a complete delivery address.' }, 422)
    // Address changes after the 20th would miss the next print run.
    if (!isAddressChangeBeforeCutoff(Date.now())) {
      return json({ error: 'The 20th-day address cut-off has passed. This change can apply only to a later edition; contact support for urgent help.' }, 409)
    }
    const updated = await updateCustomerAddress(db, session.user.id, subscriptionId, address, Date.now())
    if(updated)await recordAddressVersion(db,{ownerId:session.user.id,address,reason:'Customer account update',now:Date.now()})
    if(!updated)return json({ error: 'Subscription not found.' }, 404)
    const event=await db.prepare(`SELECT effective_at FROM account_events WHERE subscription_id=? AND event_type='address_changed' ORDER BY created_at DESC LIMIT 1`).bind(subscriptionId).first<{effective_at:number|null}>()
    return json({ok:true,effectiveAt:event?.effective_at??null})
  }
  if (body.action === 'pause' || body.action === 'resume' || body.action === 'cancel') {
    const updated = await requestCustomerAction(db, session.user.id, subscriptionId, body.action, Date.now())
    return updated ? json({ ok: true }) : json({ error: 'Subscription not found.' }, 404)
  }
  return json({ error: 'Unsupported account action.' }, 400)
}

export function isAddressChangeBeforeCutoff(now: number, timeZone = process.env.BUSINESS_TIME_ZONE || 'Asia/Kolkata', cutoffDay = Number(process.env.BUSINESS_CUTOFF_DAY || 20)) {
  const day = Number(new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit' }).format(new Date(now)))
  return day <= cutoffDay
}
