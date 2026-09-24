import { readAdministratorSession } from './auth.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { calculatePricing } from '#/lib/pricing.server'
import { recordUserRole } from '#/lib/canonical-data.server'
import { base64url, fromBase64url } from '#/lib/codec'
import { storeObject } from '#/lib/object-storage.server'
import {
  audit, createEdition, dispatchRows, generateEditionEligibility, getAdminDashboard, lockEdition, overrideEditionEligibility,
  updateAdminAddress, updateEnquiry, updateFulfilment, updateSubscriptionStatus, upsertCatalog, upsertContent,
} from './store.server'

const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/
const STATUSES = new Set(['upcoming','active','paused','cancelled','completed','refunded','payment_failed'])
const FULFILMENT_STATUSES = new Set(['scheduled','prepared','dispatched','delivered','delayed','returned','replacement'])
const ENQUIRY_STATUSES = new Set(['new','in_progress','waiting_customer','resolved','closed'])

function db() { try { return lifecycleBindings().db } catch { return null } }
function text(value: unknown, max = 160) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }

export async function getAdmin(request: Request) {
  const session = await readAdministratorSession(request)
  if (!session) return json({ error: 'Administrator access required.' }, 403)
  const database = db()
  if (!database) return json({ error: 'Admin data is temporarily unavailable.' }, 503)
  await recordUserRole(database,session.user.id,'admin')
  return json({ user: session.user, csrf: session.csrf, ...(await getAdminDashboard(database)) })
}

export async function mutateAdmin(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Forbidden.' }, 403)
  const session = await readAdministratorSession(request)
  if (!session) return json({ error: 'Administrator access required.' }, 403)
  const database = db()
  if (!database) return json({ error: 'Admin data is temporarily unavailable.' }, 503)
  await recordUserRole(database,session.user.id,'admin')
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'Invalid request.' }, 400) }
  if (body.csrf !== session.csrf) return json({ error: 'Your session changed. Refresh and retry.' }, 403)
  const action = text(body.action, 80)
  try {
    if (action === 'edition.create') {
      const label = text(body.label, 100), issueNumber = Number(body.issueNumber), cutoff = Date.parse(String(body.cutoff)), dispatch = Date.parse(String(body.dispatch))
      if (!label || !Number.isInteger(issueNumber) || issueNumber < 1 || !Number.isFinite(cutoff) || !Number.isFinite(dispatch) || dispatch <= cutoff) return json({ error: 'Enter valid edition dates and issue number.' }, 422)
      return json({ ok: true, id: await createEdition(database, session.user.id, { label, issueNumber, cutoff, dispatch }) })
    }
    if (action === 'edition.generate') {
      const editionId = text(body.editionId)
      if (!SAFE_ID.test(editionId)) return json({ error: 'Invalid edition.' }, 400)
      const count = await generateEditionEligibility(database, session.user.id, editionId)
      return count === null ? json({ error: 'Only a draft edition can generate a frozen eligibility snapshot.' }, 409) : json({ ok: true, count })
    }
    if(action==='edition.override'){
      const editionId=text(body.editionId),subscriptionId=text(body.subscriptionId),reason=text(body.reason,500)
      if(!SAFE_ID.test(editionId)||!SAFE_ID.test(subscriptionId)||typeof body.include!=='boolean'||reason.length<5)return json({error:'A valid eligibility override and reason are required.'},422)
      return await overrideEditionEligibility(database,session.user.id,editionId,subscriptionId,body.include,reason)?json({ok:true}):json({error:'Only an unlocked generated list can be overridden.'},409)
    }
    if(action==='edition.lock'){
      const editionId=text(body.editionId),reason=text(body.reason,500)
      if(!SAFE_ID.test(editionId)||reason.length<5)return json({error:'An approval reason is required.'},422)
      return await lockEdition(database,session.user.id,editionId,reason)?json({ok:true}):json({error:'Generate and review the list before locking it.'},409)
    }
    if (action === 'subscription.status') {
      const subscriptionId = text(body.subscriptionId), status = text(body.status, 30), reason = text(body.reason, 500)
      if (!SAFE_ID.test(subscriptionId) || !STATUSES.has(status) || reason.length < 5) return json({ error: 'Choose a valid status and provide a reason.' }, 422)
      return await updateSubscriptionStatus(database, session.user.id, subscriptionId, status, reason) ? json({ ok: true }) : json({ error: 'This status transition is not permitted.' }, 409)
    }
    if (action === 'subscription.address') {
      const subscriptionId = text(body.subscriptionId)
      const raw = body.address as Record<string, unknown> | undefined
      const address = raw && { name:text(raw.name,100), line1:text(raw.line1), line2:text(raw.line2)||undefined, city:text(raw.city,100), region:text(raw.region,100)||undefined, postalCode:text(raw.postalCode,24), country:text(raw.country,2).toUpperCase() }
      const reason = text(body.reason, 500)
      if (!SAFE_ID.test(subscriptionId) || !address || !address.name || !address.line1 || !address.city || !address.postalCode || !/^[A-Z]{2}$/.test(address.country) || reason.length < 5) return json({ error: 'Enter a complete address and correction reason.' }, 422)
      return await updateAdminAddress(database, session.user.id, subscriptionId, address, reason) ? json({ ok:true }) : json({ error:'Subscription not found.' },404)
    }
    if (action === 'payment.status') {
      return json({error:'Refund status is recorded only from a verified Razorpay webhook.'},409)
    }
    if (action === 'fulfilment.status') {
      const fulfilmentId = text(body.fulfilmentId), status = text(body.status, 30), trackingUrl = text(body.trackingUrl, 500), courier = text(body.courier, 100)
      if (!SAFE_ID.test(fulfilmentId) || !FULFILMENT_STATUSES.has(status) || (trackingUrl && !trackingUrl.startsWith('https://'))) return json({ error: 'Invalid fulfilment update.' }, 422)
      return await updateFulfilment(database, session.user.id, fulfilmentId, status, trackingUrl, courier) ? json({ ok: true }) : json({ error: 'This fulfilment transition is not permitted or the edition is not locked.' }, 409)
    }
    if (action === 'catalog.upsert') {
      const kind = text(body.kind, 30)
      const safe = kind === 'product' ? { id:text(body.id), name:text(body.name), description:text(body.description,1000), baseMonthlyMinor:Number(body.baseMonthlyMinor ?? 999), active:body.active!==false } : kind === 'option' ? {
        id: text(body.id), name: text(body.name), durationMonths: Number(body.durationMonths), amountMinor: Number(body.amountMinor), discountBasisPoints:Number(body.discountBasisPoints ?? 0), currency: text(body.currency, 3).toUpperCase(), active: body.active !== false,
      } : kind === 'discount' ? {
        id: text(body.id), code: text(body.code, 50).toUpperCase(), kind: text(body.discountKind, 30), value: Number(body.value),
        startsAt: body.startsAt ? Date.parse(String(body.startsAt)) : null, endsAt: body.endsAt ? Date.parse(String(body.endsAt)) : null,
        usageLimit: body.usageLimit ? Number(body.usageLimit) : null, perCustomerLimit: body.perCustomerLimit ? Number(body.perCustomerLimit) : null,
        minimumDurationMonths: body.minimumDurationMonths ? Number(body.minimumDurationMonths) : null,
        minimumOrderMinor: body.minimumOrderMinor ? Number(body.minimumOrderMinor) : null,
        eligibleDurations: text(body.eligibleDurations,200) ? JSON.stringify(text(body.eligibleDurations,200).split(',').map(Number).filter(Number.isFinite)) : null,
        eligibleCountries: text(body.eligibleCountries,200) ? JSON.stringify(text(body.eligibleCountries,200).split(',').map(v=>v.trim().toUpperCase()).filter(Boolean)) : null,
        combinable: body.combinable === true || body.combinable === 'on', active: body.active !== false,
      } : {
        countryCode: text(body.countryCode, 2).toUpperCase(), countryName: text(body.countryName), currency: text(body.currency, 3).toUpperCase(), shippingMinor: Number(body.shippingMinor), additionalCopyMinor:Number(body.additionalCopyMinor ?? 0), taxRateBasisPoints: Number(body.taxRateBasisPoints), active: body.active !== false,
      }
      if (!await upsertCatalog(database, session.user.id, kind, safe)) return json({ error: 'Invalid catalogue type.' }, 422)
      return json({ ok: true })
    }
    if (action === 'discount.preview') {
      const durationMonths=Number(body.durationMonths), quantity=Number(body.quantity), countryCode=text(body.countryCode,2).toUpperCase(), discountCode=text(body.discountCode,50)
      const quote=await calculatePricing(database,{durationMonths,quantity,countryCode,discountCode,userId:`preview:${session.user.id}`,includeInactiveDiscount:true,now:Date.now()})
      return quote ? json({ok:true,quote}) : json({error:'This offer is not eligible for the preview order.'},422)
    }
    if (action === 'content.upsert') {
      const key = text(body.key, 80), title = text(body.title, 200), contentBody = text(body.body, 20_000)
      if (!SAFE_ID.test(key) || !title || !contentBody) return json({ error: 'Complete all content fields.' }, 422)
      await upsertContent(database, session.user.id, key, title, contentBody)
      return json({ ok: true })
    }
    if (action === 'enquiry.update') {
      const enquiryId = text(body.enquiryId), status = text(body.status, 30), staffNotes = text(body.staffNotes, 4000)
      if (!SAFE_ID.test(enquiryId) || !ENQUIRY_STATUSES.has(status)) return json({ error: 'Invalid enquiry update.' }, 422)
      return await updateEnquiry(database, session.user.id, enquiryId, status, staffNotes) ? json({ ok: true }) : json({ error: 'Enquiry not found.' }, 404)
    }
    return json({ error: 'Unsupported admin action.' }, 400)
  } catch {
    console.error('admin_mutation_failed')
    return json({ error: 'The update could not be completed.' }, 409)
  }
}

function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"` }

const EXPORT_COOKIE='__Host-puzzle_dispatch_export'
async function exportKey(){const secret=process.env.EXPORT_SIGNING_SECRET||process.env.SESSION_SECRET;if(!secret)return null;return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function issueExportGrant(userId:string,editionId:string){const expires=Date.now()+2*60*1000,payload=base64url(new TextEncoder().encode(JSON.stringify({userId,editionId,expires,nonce:crypto.randomUUID()}))),key=await exportKey();if(!key)return null;const signature=base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))));return `${payload}.${signature}`}
async function validExportGrant(request:Request,userId:string,editionId:string){const raw=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).find(v=>v.startsWith(`${EXPORT_COOKIE}=`))?.slice(EXPORT_COOKIE.length+1);if(!raw)return false;const [payload,signature]=decodeURIComponent(raw).split('.'),key=await exportKey();if(!payload||!signature||!key)return false;try{if(!await crypto.subtle.verify('HMAC',key,fromBase64url(signature),new TextEncoder().encode(payload)))return false;const value=JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as {userId:string;editionId:string;expires:number};return value.userId===userId&&value.editionId===editionId&&value.expires>Date.now()}catch{return false}}

export async function getDispatchCsv(request: Request) {
  const session = await readAdministratorSession(request)
  if (!session) return new Response('Administrator access required.', { status: 403 })
  const database = db()
  if (!database) return new Response('Admin data is temporarily unavailable.', { status: 503 })
  const editionId = new URL(request.url).searchParams.get('edition') ?? ''
  if (!SAFE_ID.test(editionId)) return new Response('Invalid edition.', { status: 400 })
  if(!await validExportGrant(request,session.user.id,editionId)){const grant=await issueExportGrant(session.user.id,editionId);if(!grant)return new Response('Export signing is unavailable.',{status:503});return new Response(null,{status:303,headers:{Location:new URL(request.url).toString(),'Set-Cookie':`${EXPORT_COOKIE}=${encodeURIComponent(grant)}; Path=/; Max-Age=120; HttpOnly; Secure; SameSite=Strict`,'Cache-Control':'no-store'}})}
  const rows = await dispatchRows(database, editionId)
  if (!rows) return new Response('Edition not found.', { status: 404 })
  await audit(database,session.user.id,'edition.dispatch_exported','edition',editionId,{rowCount:rows.length,expiresWithinSeconds:120})
  const header = ['fulfilment_id','edition','quantity','name','address_line_1','address_line_2','city','region','postal_code','country','contact_email']
  const lines = rows.map(row => [row.fulfilment_id,row.edition_label,row.quantity,row.address?.name,row.address?.line1,row.address?.line2,row.address?.city,row.address?.region,row.address?.postalCode,row.address?.country,row.contact_email].map(csvCell).join(','))
  const content=[header.map(csvCell).join(','), ...lines].join('\r\n')
  try{await storeObject({category:'dispatch_export',relatedType:'edition',relatedId:editionId,originalName:`dispatch-${editionId}.csv`,contentType:'text/csv; charset=utf-8',size:new TextEncoder().encode(content).byteLength,createdBy:session.user.id,body:content})}catch{console.error(JSON.stringify({message:'dispatch_export_archive_failed',editionId}))}
  return new Response(content, { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="dispatch-${editionId}.csv"`, 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff',
  } })
}
