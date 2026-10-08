import { deleteRequestedCustomer } from './deletion.server'
import { readAdministratorSession } from './auth.server'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { calculatePricing } from '#/lib/pricing.server'
import { recordUserRole } from '#/lib/canonical-data.server'
import { base64url, fromBase64url } from '#/lib/codec'
import { storeObject } from '#/lib/object-storage.server'
import { deliveryPrintPdf } from './dispatch-pdf.server'
import { updateCustomerContact } from './directory.server'
import { RefundRequestError, requestFullRazorpayRefund } from '#/lib/refund.server'
import {
  activePaidDeliveryRows, audit, createEdition, deleteEdition, dispatchRows, generateEditionEligibility, getAdminDashboard, lockEdition, overrideEditionEligibility,
  updateAdminAddress, updateEdition, updateEnquiry, updateFulfilment, updateSubscriptionStatus, upsertCatalog, upsertContent,
} from './store.server'

const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/
const STATUSES = new Set(['upcoming','active','paused','cancelled','completed','refunded','payment_failed'])
const FULFILMENT_STATUSES = new Set(['scheduled','prepared','dispatched','delivered','delayed','returned','replacement'])
const ENQUIRY_STATUSES = new Set(['new','in_progress','waiting_customer','resolved','closed'])

function db() { try { return lifecycleBindings().db } catch { return null } }
function text(value: unknown, max = 160) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function optionalNumber(value:unknown) { return value===undefined||value===null||value===''?null:Number(value) }

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
    if(action==='customer.delete'){
      const userId=text(body.userId),requestId=text(body.requestId)
      if(!SAFE_ID.test(userId)||!SAFE_ID.test(requestId)||body.confirm!==true)return json({error:'Confirm the requested account deletion.'},422)
      try{await deleteRequestedCustomer(database,session.user.id,userId,requestId);return json({ok:true})}catch{return json({error:'Deletion could not be completed. Access is restricted if deletion started. Payment and fulfilment history is retained where required.'},503)}
    }
    if(action==='newsletter.unsubscribe') {
      const subscriberId=text(body.subscriberId)
      if(!SAFE_ID.test(subscriberId))return json({error:'Invalid email signup.'},422)
      const result=await database.prepare(`UPDATE newsletter_subscribers SET status='unsubscribed',updated_at=? WHERE id=?`).bind(Date.now(),subscriberId).run()
      if((result.meta.changes??0)!==1)return json({error:'Email signup not found.'},404)
      await audit(database,session.user.id,'newsletter.unsubscribed','newsletter',subscriberId,{source:'administrator'})
      return json({ok:true})
    }
    if(action==='newsletter.delete') {
      const subscriberId=text(body.subscriberId)
      if(!SAFE_ID.test(subscriberId)||body.confirm!==true)return json({error:'Confirm the newsletter subscriber deletion.'},422)
      const result=await database.prepare(`DELETE FROM newsletter_subscribers WHERE id=?`).bind(subscriberId).run()
      if((result.meta.changes??0)!==1)return json({error:'Email signup not found.'},404)
      await audit(database,session.user.id,'newsletter.deleted','newsletter',subscriberId,{source:'administrator'})
      return json({ok:true})
    }
    if (action === 'customer.contact') {
      const userId=text(body.userId), name=text(body.name,100), email=text(body.email,200).toLowerCase(), phone=text(body.phone,30), whatsapp=text(body.whatsapp,30), reason=text(body.reason,500)||'Administrator contact edit'
      if(!SAFE_ID.test(userId)||!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||(phone&&!/^\+?[0-9 ()-]{7,30}$/.test(phone))||(whatsapp&&!/^\+[1-9][0-9]{7,14}$/.test(whatsapp)))return json({error:'Enter a name, valid email and WhatsApp number with country code (for example +917373050093).'},422)
      return await updateCustomerContact(database,session.user.id,{userId,name,email,phone,whatsapp,reason})?json({ok:true}):json({error:'Customer not found.'},404)
    }
    if (action === 'discount.toggle') {
      const discountId=text(body.discountId)
      if(!SAFE_ID.test(discountId)||typeof body.active!=='boolean')return json({error:'Invalid offer.'},422)
      const result=await database.prepare('UPDATE admin_discounts SET active=?,updated_at=? WHERE id=?').bind(body.active?1:0,Date.now(),discountId).run()
      if((result.meta.changes??0)!==1)return json({error:'Offer not found.'},404)
      await audit(database,session.user.id,'discount.activation_changed','discount',discountId,{active:body.active})
      return json({ok:true})
    }
    if (action === 'discount.delete') {
      const discountId=text(body.discountId)
      if(!SAFE_ID.test(discountId)||body.confirm!==true)return json({error:'Confirm the offer deletion.'},422)
      const redeemed=await database.prepare(`SELECT id FROM discount_redemptions WHERE discount_id=? LIMIT 1`).bind(discountId).first()
      if(redeemed)return json({error:'This offer has already been used and cannot be deleted. Deactivate it instead to preserve order history.'},409)
      const result=await database.prepare(`DELETE FROM admin_discounts WHERE id=?`).bind(discountId).run()
      if((result.meta.changes??0)!==1)return json({error:'Offer not found.'},404)
      await audit(database,session.user.id,'discount.deleted','discount',discountId,{})
      return json({ok:true})
    }
    if (action === 'referral.settings') {
      const percentage=Number(body.percentage)
      if(!Number.isFinite(percentage)||percentage<0||percentage>100)return json({error:'Enter a referral discount from 0 to 100%.'},422)
      const now=Date.now(),basisPoints=Math.round(percentage*100)
      await database.prepare(`INSERT INTO referral_settings(id,discount_basis_points,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET discount_basis_points=excluded.discount_basis_points,updated_at=excluded.updated_at`).bind(basisPoints,now).run()
      await audit(database,session.user.id,'referral.settings_updated','referral_settings','1',{basisPoints})
      return json({ok:true})
    }
    if (action === 'edition.create') {
      const label = text(body.label, 100), issueNumber = Number(body.issueNumber), copiesAvailable=Number(body.copiesAvailable ?? 0), dispatch = body.dispatch?Date.parse(String(body.dispatch)):NaN, cutoff = body.cutoff?Date.parse(String(body.cutoff)):dispatch-24*60*60*1000
      if (!label || !Number.isInteger(issueNumber) || issueNumber < 1 || !Number.isSafeInteger(copiesAvailable) || copiesAvailable < 0 || !Number.isFinite(cutoff) || !Number.isFinite(dispatch) || dispatch <= cutoff) return json({ error: 'Enter a valid edition name, number and copy quantity.' }, 422)
      return json({ ok: true, id: await createEdition(database, session.user.id, { label, issueNumber, copiesAvailable, cutoff, dispatch }) })
    }
    if (action === 'edition.update') {
      const editionId=text(body.editionId), label=text(body.label,100), issueNumber=Number(body.issueNumber), copiesAvailable=Number(body.copiesAvailable), dispatch=body.dispatch?Date.parse(String(body.dispatch)):NaN, cutoff=dispatch-24*60*60*1000
      if(!SAFE_ID.test(editionId)||!label||!Number.isInteger(issueNumber)||issueNumber<1||!Number.isSafeInteger(copiesAvailable)||copiesAvailable<0||!Number.isFinite(dispatch))return json({error:'Enter a valid edition name, number, copy quantity and dispatch date.'},422)
      try {
        return await updateEdition(database,session.user.id,editionId,{label,issueNumber,copiesAvailable,cutoff,dispatch})?json({ok:true}):json({error:'Only editions with no prepared or dispatched copies can be edited.'},409)
      } catch { return json({error:'That edition number is already in use.'},409) }
    }
    if (action === 'edition.delete') {
      const editionId=text(body.editionId)
      if(!SAFE_ID.test(editionId)||body.confirm!==true)return json({error:'Confirm the unused edition deletion.'},422)
      return await deleteEdition(database,session.user.id,editionId)?json({ok:true}):json({error:'Only editions with no prepared or dispatched copies can be removed.'},409)
    }
    if (action === 'edition.generate') {
      const editionId = text(body.editionId)
      if (!SAFE_ID.test(editionId)) return json({ error: 'Invalid edition.' }, 400)
      const count = await generateEditionEligibility(database, session.user.id, editionId)
      return count === null ? json({ error: 'Only a draft edition can generate a frozen eligibility snapshot.' }, 409) : json({ ok: true, count })
    }
    if(action==='edition.price'){
      const editionId=text(body.editionId), copyPriceMinor=Number(body.copyPriceMinor)
      if(!SAFE_ID.test(editionId)||!Number.isSafeInteger(copyPriceMinor)||copyPriceMinor<0)return json({error:'Enter a valid edition and copy price.'},422)
      const result=await database.prepare(`UPDATE editions SET copy_price_minor=?,updated_at=? WHERE id=? AND status='draft'`).bind(copyPriceMinor,Date.now(),editionId).run()
      if((result.meta.changes??0)!==1)return json({error:'Only draft editions can have their copy price changed.'},409)
      await audit(database,session.user.id,'edition.price_updated','edition',editionId,{copyPriceMinor})
      return json({ok:true})
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
      const email=text(body.email,200).toLowerCase(), phone=text(body.phone,30)
      const reason = text(body.reason, 500)
      if (!SAFE_ID.test(subscriptionId) || !address || !address.name || !address.line1 || !address.city || !address.postalCode || !/^[A-Z]{2}$/.test(address.country) || reason.length < 5 || (email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (phone&&!/^\+?[0-9 ()-]{7,30}$/.test(phone))) return json({ error: 'Enter complete delivery details, a valid email/phone and a correction reason.' }, 422)
      return await updateAdminAddress(database, session.user.id, subscriptionId, address, reason,{email,phone}) ? json({ ok:true }) : json({ error:'Subscription not found.' },404)
    }
    if (action === 'payment.refund') {
      const subscriptionId=text(body.subscriptionId)
      if(!SAFE_ID.test(subscriptionId))return json({error:'Invalid subscription.'},422)
      try {
        const result=await requestFullRazorpayRefund(database,{subscriptionId,actorId:session.user.id,source:'administrator'})
        await audit(database,session.user.id,'payment.refund_requested','subscription',subscriptionId,{status:result.status,refundId:result.refundId})
        return json({ok:true,message:result.status==='processed'?'Full refund processed.':'Full refund requested from Razorpay.'})
      } catch(error) {
        if(error instanceof RefundRequestError)return json({error:error.message},error.status)
        console.error('admin_refund_failed')
        return json({error:'Razorpay refund could not be requested.'},502)
      }
    }
    if (action === 'fulfilment.status') {
      const fulfilmentId = text(body.fulfilmentId), status = text(body.status, 30), trackingUrl = text(body.trackingUrl, 500), courier = text(body.courier, 100)
      if (!SAFE_ID.test(fulfilmentId) || !FULFILMENT_STATUSES.has(status) || (trackingUrl && !trackingUrl.startsWith('https://'))) return json({ error: 'Invalid fulfilment update.' }, 422)
      return await updateFulfilment(database, session.user.id, fulfilmentId, status, trackingUrl, courier) ? json({ ok: true }) : json({ error: 'This fulfilment transition is not permitted or the edition is not locked.' }, 409)
    }
    if(action==='regional.price'){
      const countryCode=text(body.countryCode,2).toUpperCase(), currency=text(body.currency,3).toUpperCase(), amountMinor=Number(body.amountMinor)
      if(!/^[A-Z]{2}$/.test(countryCode)||!/^[A-Z]{3}$/.test(currency)||!Number.isSafeInteger(amountMinor)||amountMinor<0)return json({error:'Choose a valid country, currency and regional price.'},422)
      const result=await database.prepare(`UPDATE admin_shipping_zones SET currency=?,regional_monthly_price_minor=?,updated_at=? WHERE country_code=?`).bind(currency,amountMinor,Date.now(),countryCode).run()
      if((result.meta.changes??0)!==1)return json({error:'Add delivery pricing for this country before setting its regional price.'},404)
      await audit(database,session.user.id,'regional.price_updated','shipping_zone',countryCode,{currency,amountMinor})
      return json({ok:true})
    }
    if(action==='shipping.delete'){
      const countryCode=text(body.countryCode,2).toUpperCase()
      if(!/^[A-Z]{2}$/.test(countryCode))return json({error:'Invalid country.'},422)
      const result=await database.prepare(`DELETE FROM admin_shipping_zones WHERE country_code=?`).bind(countryCode).run()
      if((result.meta.changes??0)!==1)return json({error:'Country pricing not found.'},404)
      await audit(database,session.user.id,'shipping_zone.deleted','shipping_zone',countryCode,{})
      return json({ok:true})
    }
    if (action === 'catalog.upsert') {
      const kind = text(body.kind, 30)
      const safe = kind === 'product' ? { id:text(body.id), name:text(body.name), description:text(body.description,1000), baseMonthlyMinor:Number(body.baseMonthlyMinor ?? 999), active:body.active!==false } : kind === 'option' ? {
        id: text(body.id), name: text(body.name), durationMonths: Number(body.durationMonths), amountMinor: Number(body.amountMinor), monthlyPriceMinor: optionalNumber(body.monthlyPriceMinor), discountBasisPoints:Number(body.discountBasisPoints ?? 0), currency: text(body.currency, 3).toUpperCase(), active: body.active !== false,
      } : kind === 'discount' ? {
        id: text(body.id), name: text(body.name, 100), code: text(body.code, 50).toUpperCase(), kind: text(body.discountKind, 30), value: Number(body.value),
        startsAt: body.startsAt ? Date.parse(String(body.startsAt)) : null, endsAt: body.endsAt ? Date.parse(String(body.endsAt)) : null,
        usageLimit: optionalNumber(body.usageLimit), perCustomerLimit: optionalNumber(body.perCustomerLimit),
        minimumDurationMonths: optionalNumber(body.minimumDurationMonths),
        minimumOrderMinor: optionalNumber(body.minimumOrderMinor),
        eligibleDurations: text(body.eligibleDurations,200) ? JSON.stringify(text(body.eligibleDurations,200).split(',').map(Number).filter(Number.isFinite)) : null,
        eligibleCountries: text(body.eligibleCountries,200) ? JSON.stringify(text(body.eligibleCountries,200).split(',').map(v=>v.trim().toUpperCase()).filter(Boolean)) : null,
        combinable: body.combinable === true || body.combinable === 'on', active: body.active !== false,
      } : {
        countryCode: text(body.countryCode, 2).toUpperCase(), countryName: text(body.countryName), currency: text(body.currency, 3).toUpperCase(), shippingMinor: Number(body.shippingMinor), additionalCopyMinor:Number(body.additionalCopyMinor ?? 0), taxRateBasisPoints: Number(body.taxRateBasisPoints), active: body.active !== false,
      }
      if(kind==='shipping'){
        const countryInput=String(body.countryCode??'').trim(), currencyInput=String(body.currency??'').trim()
        const shippingMinor=Number(safe.shippingMinor), additionalCopyMinor=Number(safe.additionalCopyMinor), taxRateBasisPoints=Number(safe.taxRateBasisPoints)
        const validCountry=/^[A-Za-z]{2}$/.test(countryInput), validCurrency=/^[A-Za-z]{3}$/.test(currencyInput)
        const validMoney=Number.isSafeInteger(shippingMinor)&&shippingMinor>=0&&Number.isSafeInteger(additionalCopyMinor)&&additionalCopyMinor>=0
        const validTax=Number.isSafeInteger(taxRateBasisPoints)&&taxRateBasisPoints>=0&&taxRateBasisPoints<=10000
        if(!validCountry||!safe.countryName||!validCurrency||!validMoney||!validTax)return json({error:'Enter a valid country, currency and non-negative delivery prices.'},422)
      }
      if(kind==='option'&&safe.monthlyPriceMinor!==null&&(!Number.isSafeInteger(safe.monthlyPriceMinor)||Number(safe.monthlyPriceMinor)<=0))return json({error:'Enter a positive monthly price in minor units.'},422)
      if(kind==='discount') {
        const durations=text(body.eligibleDurations,200), countries=text(body.eligibleCountries,200)
        if((durations&&!durations.split(',').every(value=>/^\d+$/.test(value.trim())&&Number(value)>0&&Number.isSafeInteger(Number(value))))||(countries&&!countries.split(',').every(value=>/^[A-Za-z]{2}$/.test(value.trim()))))return json({error:'Enter positive whole months and two-letter country codes, separated by commas.'},422)
        const nonnegative=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0
        const optionalPositive=(value:unknown)=>value===null||(Number.isSafeInteger(value)&&Number(value)>0)
        if(!SAFE_ID.test(String(safe.id))||!safe.name||!safe.code||!['percentage','fixed','free_shipping'].includes(String(safe.kind))||!nonnegative(safe.value)||(safe.kind==='percentage'&&Number(safe.value)>10000)||!optionalPositive(safe.usageLimit)||!optionalPositive(safe.perCustomerLimit)||!optionalPositive(safe.minimumDurationMonths)||(safe.minimumOrderMinor!==null&&!nonnegative(safe.minimumOrderMinor))||(safe.startsAt!==null&&!Number.isFinite(safe.startsAt))||(safe.endsAt!==null&&!Number.isFinite(safe.endsAt))||(safe.startsAt!==null&&safe.endsAt!==null&&Number(safe.endsAt)<=Number(safe.startsAt)))return json({error:'Enter a valid offer name, discount amounts, limits and dates; expiry must follow the start.'},422)
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
  const exportScope=editionId||'active-paid-customers'
  if(editionId&&!SAFE_ID.test(editionId)) return new Response('Invalid edition.', { status: 400 })
  if(!await validExportGrant(request,session.user.id,exportScope)){const grant=await issueExportGrant(session.user.id,exportScope);if(!grant)return new Response('Export signing is unavailable.',{status:503});return new Response(null,{status:303,headers:{Location:new URL(request.url).toString(),'Set-Cookie':`${EXPORT_COOKIE}=${encodeURIComponent(grant)}; Path=/; Max-Age=120; HttpOnly; Secure; SameSite=Strict`,'Cache-Control':'no-store'}})}
  const rows = editionId?await dispatchRows(database, editionId):await activePaidDeliveryRows(database)
  if (!rows) return new Response('Edition not found.', { status: 404 })
  const format=new URL(request.url).searchParams.get('format')==='pdf'?'pdf':'csv'
  await audit(database,session.user.id,'delivery_print_exported',editionId?'edition':'customers',exportScope,{rowCount:rows.length,expiresWithinSeconds:120})
  if(format==='pdf'){
    const pdf=deliveryPrintPdf(rows.map(row=>({name:row.address?.name??'',address:[row.address?.line1,row.address?.line2,row.address?.city,row.address?.region,row.address?.postalCode,row.address?.country].filter(Boolean).join(', '),phone:row.contact_phone??'',status:row.subscription_status,endsAt:row.ends_at?new Date(row.ends_at).toLocaleDateString('en-GB'):'—'})),'Delivery addresses')
    return new Response(pdf,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="offscroll-times-current-delivery-list.pdf"`,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}})
  }
  const header = ['fulfilment_id','edition','quantity','name','address_line_1','address_line_2','city','region','postal_code','country','contact_email']
  const lines = rows.map(row => [row.fulfilment_id,row.edition_label,row.quantity,row.address?.name,row.address?.line1,row.address?.line2,row.address?.city,row.address?.region,row.address?.postalCode,row.address?.country,row.contact_email].map(csvCell).join(','))
  const content=[header.map(csvCell).join(','), ...lines].join('\r\n')
  try{await storeObject({category:'dispatch_export',relatedType:'edition',relatedId:editionId,originalName:`dispatch-${editionId}.csv`,contentType:'text/csv; charset=utf-8',size:new TextEncoder().encode(content).byteLength,createdBy:session.user.id,body:content})}catch{console.error(JSON.stringify({message:'dispatch_export_archive_failed',editionId}))}
  return new Response(content, { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="dispatch-${editionId}.csv"`, 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff',
  } })
}
