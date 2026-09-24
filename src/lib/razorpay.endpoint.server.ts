import { readSession } from '#/lib/auth.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'
import { calculatePricing } from '#/lib/pricing.server'
import { applyCustomerPaymentSucceeded, recordAccountEvent, registerCustomerCheckout, saveCustomerCheckoutDetails, type CustomerAddress } from '#/lib/customer/store.server'
import { createRazorpayOrder, RazorpayApiError, razorpayPublicKey, retrieveRazorpayPayment, verifyCheckoutSignature, verifyWebhookSignature } from './razorpay.server'
import { BUSINESS_DETAILS, CONTACT_EMAIL, CONTACT_HOURS } from '#/content/site'
import { recordCustomerOrder } from '#/lib/canonical-data.server'
import { allowRequest } from '#/lib/rate-limit.server'
import { recordOperationalAnalytics } from '#/lib/analytics.server'
import { storeObject } from '#/lib/object-storage.server'

const safe=(v:unknown,n=160)=>typeof v==='string'?v.trim().slice(0,n):''
const address=(v:unknown):CustomerAddress|null=>{if(!v||typeof v!=='object')return null;const x=v as Record<string,unknown>;const a={name:safe(x.name,100),line1:safe(x.line1),line2:safe(x.line2)||undefined,city:safe(x.city,100),region:safe(x.region,100)||undefined,postalCode:safe(x.postalCode,24),country:safe(x.country,2).toUpperCase()};return a.name&&a.line1&&a.city&&a.postalCode&&/^[A-Z]{2}$/.test(a.country)?a:null}
const database=()=>{try{return lifecycleBindings().db}catch{return null}}

async function archiveReceipt(db:D1Database,input:{subscriptionId:string;userId:string;paymentId:string;paidAt:number}){
  const existing=await db.prepare(`SELECT id FROM object_storage_records WHERE category='receipt' AND related_id=? AND deleted_at IS NULL`).bind(input.paymentId).first()
  if(existing)return
  const row=await db.prepare(`SELECT p.amount_minor,p.currency,s.plan_name,s.duration_months,s.quantity,s.contact_email FROM customer_payments p JOIN customer_subscriptions s ON s.id=p.subscription_id WHERE p.subscription_id=? AND p.provider_payment_id=?`).bind(input.subscriptionId,input.paymentId).first<Record<string,unknown>>()
  if(!row)return
  const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
  const html=`<!doctype html><meta charset="utf-8"><title>Offscroll Times receipt</title><h1>Offscroll Times</h1><p>Payment receipt ${esc(input.paymentId)}</p><p>${esc(row.contact_email)}</p><p>${esc(row.plan_name)} · ${esc(row.duration_months)} months × ${esc(row.quantity)}</p><p><strong>${esc(row.currency)} ${(Number(row.amount_minor)/100).toFixed(2)}</strong></p><p>Paid ${esc(new Date(input.paidAt).toISOString())}</p>`
  await storeObject({category:'receipt',ownerId:input.userId,relatedType:'payment',relatedId:input.paymentId,originalName:`receipt-${input.paymentId}.html`,contentType:'text/html; charset=utf-8',size:new TextEncoder().encode(html).byteLength,createdBy:input.userId,body:html})
}

async function captured(db:D1Database,input:{subscriptionId:string;userId:string;paymentId:string;paidAt:number}){
  const now=Date.now();const activated=await applyCustomerPaymentSucceeded(db,{id:input.subscriptionId,payerUserId:input.userId,paymentId:input.paymentId,paidAt:input.paidAt,now})
  const invoiceUrl=`/api/customer/invoice/${encodeURIComponent(input.paymentId)}`
  await db.prepare(`UPDATE customer_payments SET invoice_url=?,updated_at=? WHERE subscription_id=?`).bind(invoiceUrl,now,input.subscriptionId).run()
  if(activated){
    try{await archiveReceipt(db,input)}catch{console.error(JSON.stringify({message:'receipt_archive_failed',paymentId:input.paymentId}))}
    const subscription=await db.prepare(`SELECT delivery_address_json FROM customer_subscriptions WHERE id=?`).bind(input.subscriptionId).first<{delivery_address_json:string|null}>()
    let country:string|undefined
    try{country=String(JSON.parse(subscription?.delivery_address_json??'{}').country??'')||undefined}catch{/* Invalid legacy addresses are reported elsewhere. */}
    await recordOperationalAnalytics(db,'payment_succeeded',country)
  }
}

export async function razorpayCheckout(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readSession(request);if(!session)return json({error:'Sign in before checkout.'},401)
  const db=database();if(!db)return json({error:'Checkout storage is unavailable.'},503)
  const body=await request.json() as Record<string,unknown>;if(body.csrf!==session.csrf)return json({error:'Session changed.'},403)
  const action=safe(body.action,20)
  if(!await allowRequest(request,'razorpay_checkout',12,10*60*1000,session.user.id))return json({error:'Too many checkout attempts. Try again shortly.'},429)
  if(action==='create'){
    const durationMonths=Number(body.durationMonths),quantity=Number(body.quantity),delivery=address(body.address),email=safe(body.email,200).toLowerCase(),phone=safe(body.phone,30)
    const idempotencyKey=safe(body.idempotencyKey,100)
    if(!delivery||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||body.acceptTerms!==true||!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))return json({error:'Complete contact, address and accept the terms.'},422)
    const discountCode=safe(body.discountCode,50)
    if(discountCode&&!await allowRequest(request,'coupon_apply',20,60*60*1000,session.user.id))return json({error:'Too many promotional-code attempts. Try again later.'},429)
    const quote=await calculatePricing(db,{durationMonths,quantity,countryCode:delivery.country,discountCode,userId:session.user.id,now:Date.now()})
    if(!quote)return json({error:'This selection cannot be priced.'},422)
    if(!Number.isSafeInteger(quote.totalMinor)||quote.totalMinor<100)return json({error:'The order total must be at least ₹1.'},422)
    const previous=await db.prepare(`SELECT razorpay_order_id,amount_minor,currency,pricing_snapshot_json FROM razorpay_orders WHERE owner_id=? AND idempotency_key=?`).bind(session.user.id,idempotencyKey).first<{razorpay_order_id:string;amount_minor:number;currency:string;pricing_snapshot_json:string}>()
    if(previous){const saved=JSON.parse(previous.pricing_snapshot_json);return json({ok:true,keyId:razorpayPublicKey(),orderId:previous.razorpay_order_id,amount:previous.amount_minor,currency:previous.currency,quote:saved,reused:true})}
    const subscriptionId=`rzp_${idempotencyKey}`,now=Date.now()
    await registerCustomerCheckout(db,{id:subscriptionId,userId:session.user.id,planId:`razorpay_${durationMonths}`,planName:`${durationMonths} month`,durationMonths,quantity,currency:quote.currency,amountMinor:quote.totalMinor,pricingSnapshot:quote,now})
    await db.prepare(`UPDATE customer_subscriptions SET renewal_enabled=0 WHERE id=?`).bind(subscriptionId).run()
    await saveCustomerCheckoutDetails(db,{id:subscriptionId,userId:session.user.id,email,address:delivery,now})
    await db.prepare(`UPDATE customer_subscriptions SET contact_phone=? WHERE id=?`).bind(phone,subscriptionId).run()
    let order:Record<string,any>
    try{order=await createRazorpayOrder({amount:quote.totalMinor,currency:quote.currency,receipt:subscriptionId,notes:{subscription_id:subscriptionId,user_id:session.user.id}})}
    catch(error){if(error instanceof RazorpayApiError)return json({error:error.status===401?'Razorpay credentials were rejected.':'Payment service is unavailable. Please try again.'},error.status===401?401:500);throw error}
    if(typeof order.id!=='string'||order.amount!==quote.totalMinor||order.currency!==quote.currency)return json({error:'Payment service returned an invalid order.'},502)
    await db.prepare(`INSERT INTO razorpay_orders(id,subscription_id,owner_id,razorpay_order_id,status,amount_minor,currency,pricing_snapshot_json,terms_accepted_at,created_at,updated_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),subscriptionId,session.user.id,order.id,'created',quote.totalMinor,quote.currency,JSON.stringify(quote),now,now,now,idempotencyKey).run()
    await recordCustomerOrder(db,{userId:session.user.id,email,phone,subscriptionId,providerOrderId:order.id,currency:quote.currency,amountMinor:quote.totalMinor,pricingSnapshot:quote,address:delivery,termsAcceptedAt:now})
    return json({ok:true,keyId:razorpayPublicKey(),orderId:order.id,subscriptionId,amount:quote.totalMinor,currency:quote.currency,quote})
  }
  if(action==='record_state'){
    const orderId=safe(body.orderId),paymentState=safe(body.paymentState,20)
    if(!orderId||!['cancelled','timed_out'].includes(paymentState))return json({error:'Invalid payment state.'},422)
    await db.prepare(`UPDATE razorpay_orders SET status=?,updated_at=? WHERE razorpay_order_id=? AND owner_id=? AND status IN ('created','attempted')`).bind(paymentState,Date.now(),orderId,session.user.id).run()
    return json({ok:true})
  }
  if(action==='verify'){
    const orderId=safe(body.razorpay_order_id),paymentId=safe(body.razorpay_payment_id),received=safe(body.razorpay_signature,300)
    if(!orderId||!paymentId||!received)return json({error:'Missing payment verification details.'},400)
    const row=await db.prepare(`SELECT subscription_id,amount_minor,currency FROM razorpay_orders WHERE razorpay_order_id=? AND owner_id=?`).bind(orderId,session.user.id).first<{subscription_id:string;amount_minor:number;currency:string}>()
    if(!row||!verifyCheckoutSignature(orderId,paymentId,received))return json({error:'Payment verification failed.'},400)
    let payment:Record<string,any>
    try{payment=await retrieveRazorpayPayment(paymentId)}catch(error){if(error instanceof RazorpayApiError)return json({error:error.status===401?'Razorpay credentials were rejected.':'Payment verification is temporarily unavailable.'},error.status===401?401:500);throw error}
    if(payment.order_id!==orderId||payment.amount!==row.amount_minor||payment.currency!==row.currency)return json({error:'Payment does not match this order.'},409)
    await db.prepare(`UPDATE razorpay_orders SET razorpay_payment_id=?,status=?,updated_at=? WHERE razorpay_order_id=?`).bind(paymentId,payment.status==='captured'?'captured':'verified',Date.now(),orderId).run()
    if(payment.status==='captured')await captured(db,{subscriptionId:row.subscription_id,userId:session.user.id,paymentId,paidAt:Number(payment.created_at)*1000})
    return json({ok:true,status:payment.status,subscriptionId:row.subscription_id})
  }
  return json({error:'Unsupported checkout action.'},400)
}

export async function razorpayWebhook(request:Request){
  const raw=await request.text(),received=request.headers.get('x-razorpay-signature')??'',eventId=request.headers.get('x-razorpay-event-id')??''
  if(!eventId||!verifyWebhookSignature(raw,received))return new Response('Invalid signature',{status:400})
  const db=database();if(!db)return new Response('Unavailable',{status:503})
  const inserted=await db.prepare(`INSERT INTO razorpay_webhook_receipts(event_id,event_type,received_at,processing_outcome) VALUES(?,?,?,'pending') ON CONFLICT(event_id) DO NOTHING`).bind(eventId,'pending',Date.now()).run()
  if((inserted.meta.changes??0)===0){const receipt=await db.prepare(`SELECT processing_outcome FROM razorpay_webhook_receipts WHERE event_id=?`).bind(eventId).first<{processing_outcome:string|null}>();if(receipt?.processing_outcome==='processed')return new Response('OK');if(receipt?.processing_outcome==='pending')return new Response('Already processing',{status:409});await db.prepare(`UPDATE razorpay_webhook_receipts SET processing_outcome='pending',error_summary=NULL WHERE event_id=?`).bind(eventId).run()}
  try{
    const event=JSON.parse(raw) as Record<string,any>,type=String(event.event??''),payment=event.payload?.payment?.entity
    if(payment?.order_id){const row=await db.prepare(`SELECT subscription_id,owner_id FROM razorpay_orders WHERE razorpay_order_id=?`).bind(payment.order_id).first<{subscription_id:string;owner_id:string}>();if(row){
      if(type==='payment.captured'||type==='order.paid'){await db.prepare(`UPDATE razorpay_orders SET razorpay_payment_id=?,status='captured',updated_at=? WHERE razorpay_order_id=?`).bind(payment.id,Date.now(),payment.order_id).run();await captured(db,{subscriptionId:row.subscription_id,userId:row.owner_id,paymentId:payment.id,paidAt:Number(payment.created_at)*1000})}
      if(type==='payment.failed'){const now=Date.now();await db.prepare(`UPDATE razorpay_orders SET razorpay_payment_id=?,status='failed',failure_reason=?,updated_at=? WHERE razorpay_order_id=? AND status IN ('created','attempted','verified')`).bind(payment.id,payment.error_description??'Payment failed',now,payment.order_id).run();const failed=await db.prepare(`UPDATE customer_subscriptions SET status='payment_failed',renewal_enabled=0,updated_at=? WHERE id=? AND status='upcoming'`).bind(now,row.subscription_id).run();if((failed.meta.changes??0)===1){await db.prepare(`UPDATE customer_payments SET status='failed',provider_payment_id=?,updated_at=? WHERE subscription_id=? AND status='pending'`).bind(payment.id,now,row.subscription_id).run();await recordAccountEvent(db,{userId:row.owner_id,subscriptionId:row.subscription_id,eventType:'payment_failed',title:'Payment failed',detail:'Razorpay reported that this payment was not completed. You may retry safely.',now});const subscription=await db.prepare(`SELECT delivery_address_json FROM customer_subscriptions WHERE id=?`).bind(row.subscription_id).first<{delivery_address_json:string|null}>();let country:string|undefined;try{country=String(JSON.parse(subscription?.delivery_address_json??'{}').country??'')||undefined}catch{/* Invalid legacy addresses are reported elsewhere. */}await recordOperationalAnalytics(db,'payment_failed',country)}}
    }}
    const refund=event.payload?.refund?.entity
    if(type==='refund.processed'&&refund?.payment_id){const paid=await db.prepare(`SELECT p.id,p.subscription_id,p.amount_minor,p.currency,p.owner_id FROM customer_payments p WHERE p.provider_payment_id=?`).bind(refund.payment_id).first<{id:string;subscription_id:string;amount_minor:number;currency:string;owner_id:string}>();if(paid){const now=Date.now(),amount=Math.min(Number(refund.amount)||0,paid.amount_minor);await db.prepare(`INSERT INTO refunds(id,payment_id,subscription_id,provider_refund_id,amount_minor,currency,reason,provider_status,entitlement_effect,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'processed','pending_policy_review',?,?) ON CONFLICT(id) DO NOTHING`).bind(`razorpay_${refund.id}`,paid.id,paid.subscription_id,refund.id,amount,paid.currency,'Verified Razorpay refund',now,now).run();if(amount===paid.amount_minor)await db.prepare(`UPDATE customer_payments SET status='refunded',updated_at=? WHERE id=?`).bind(now,paid.id).run();await recordAccountEvent(db,{userId:paid.owner_id,subscriptionId:paid.subscription_id,eventType:'refund_processed',title:'Refund verified',detail:`Razorpay confirmed a refund of ${paid.currency} ${(amount/100).toFixed(2)}.`,now})}}
    await db.prepare(`UPDATE razorpay_webhook_receipts SET event_type=?,processing_outcome='processed',processed_at=? WHERE event_id=?`).bind(type,Date.now(),eventId).run();return new Response('OK')
  }catch(error){await db.prepare(`UPDATE razorpay_webhook_receipts SET processing_outcome='failed',error_summary=? WHERE event_id=?`).bind(error instanceof Error?error.message.slice(0,300):'processing failed',eventId).run();return new Response('Retry later',{status:500})}
}

export async function customerInvoice(request:Request,paymentId:string){const session=await readSession(request);if(!session)return new Response('Sign in required',{status:401});const db=database();if(!db)return new Response('Unavailable',{status:503});const row=await db.prepare(`SELECT p.id,p.provider_payment_id,p.amount_minor,p.currency,p.paid_at,p.pricing_snapshot_json,s.plan_name,s.duration_months,s.quantity,s.contact_email FROM customer_payments p JOIN customer_subscriptions s ON s.id=p.subscription_id WHERE p.provider_payment_id=? AND p.owner_id=? AND p.status IN ('paid','refunded')`).bind(paymentId,session.user.id).first<Record<string,any>>();if(!row)return new Response('Receipt not found',{status:404});const q=JSON.parse(String(row.pricing_snapshot_json??'{}'));const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));return new Response(`<!doctype html><meta charset="utf-8"><title>Receipt ${esc(row.id)}</title><style>body{font:16px system-ui;max-width:720px;margin:60px auto;padding:20px;color:#26231f}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #ddd}td:last-child{text-align:right}@media print{button{display:none}}</style><button onclick="print()">Download / print receipt</button><h1>Offscroll Times</h1><p>Payment receipt · ${esc(row.id)}</p><p>Customer: ${esc(row.contact_email)}<br>Payment: ${esc(row.provider_payment_id)}<br>Paid: ${esc(new Date(row.paid_at).toLocaleString())}</p><table><tr><td>${esc(row.plan_name)} · ${esc(row.duration_months)} months × ${esc(row.quantity)}</td><td>${esc(row.currency)} ${(Number(q.subtotalMinor??row.amount_minor)/100).toFixed(2)}</td></tr><tr><td>Discount</td><td>-${((Number(q.durationDiscountMinor??0)+Number(q.offerDiscountMinor??0))/100).toFixed(2)}</td></tr><tr><td>Delivery</td><td>${(Number(q.shippingMinor??0)/100).toFixed(2)}</td></tr><tr><td>Tax (${Number(q.taxBasisPoints??0)/100}%)</td><td>${(Number(q.taxMinor??0)/100).toFixed(2)}</td></tr><tr><td><strong>Total paid</strong></td><td><strong>${esc(row.currency)} ${(Number(row.amount_minor)/100).toFixed(2)}</strong></td></tr></table><h2>Merchant and support</h2><p>Offscroll Times<br>${esc(BUSINESS_DETAILS.location)}<br>${esc(BUSINESS_DETAILS.registration)}<br>${esc(CONTACT_EMAIL)}<br>${esc(CONTACT_HOURS.india)} · ${esc(CONTACT_HOURS.responseTime)}</p>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"}})}
