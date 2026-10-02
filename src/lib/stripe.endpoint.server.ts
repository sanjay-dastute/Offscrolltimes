import {recordStripeCancellationRefund} from './stripe-refund.server'
import { createHash } from 'node:crypto'
import { readSession } from './auth.server'
import { lifecycleBindings } from './lifecycle/env.server'
import { isSameOrigin } from './security'
import { json } from './http.server'
import { allowRequest } from './rate-limit.server'
import { calculatePricing } from './pricing.server'
import { recordCustomerOrder } from './canonical-data.server'
import { registerCustomerCheckout,saveCustomerCheckoutDetails,recordAccountEvent } from './customer/store.server'
import { firstEditionTimestamp } from './dates'
import { stripeApi,verifyStripeWebhook } from './stripe.server'
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
const text=(value:unknown,max=160)=>typeof value==='string'?value.trim().slice(0,max):''
const providerId=(value:any)=>typeof value==='string'?value:value?.id

export async function stripeCheckout(request:Request){
  if(!isSameOrigin(request))return json({error:'Forbidden.'},403)
  const session=await readSession(request)
  if(!session)return json({error:'Sign in before subscribing.'},401)
  if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return json({error:'Subscription checkout is being configured. Please contact support.'},503)
  try{
    const db=lifecycleBindings().db
    if(!await allowRequest(request,'stripe_checkout',10,600000,session.user.id))return json({error:'Too many attempts. Please retry later.'},429)
    const body=await request.json() as Record<string,any>
    if(body.csrf!==session.csrf)return json({error:'Refresh your session and retry.'},403)
    const months=Number(body.durationMonths),quantity=Number(body.quantity),email=text(body.email,254).toLowerCase(),phone=text(body.whatsapp??body.phone,30)
    const saved=body.useProfileAddress===true?await db.prepare(`SELECT a.name,a.line1,a.line2,a.city,a.region,a.postal_code postalCode,a.country FROM addresses a JOIN customers c ON c.id=a.customer_id JOIN users u ON u.id=c.user_id WHERE u.owner_id=? AND a.address_type='delivery' AND a.active_to IS NULL ORDER BY a.version DESC LIMIT 1`).bind(session.user.id).first<Record<string,any>>():null
    if(body.useProfileAddress===true&&!saved)return json({error:'Save a delivery address in your profile first.'},422)
    const input=saved??body.address??{}
    const address={name:text(input.name,100),line1:text(input.line1),line2:text(input.line2),city:text(input.city,100),region:text(input.region,100),postalCode:text(input.postalCode,24),country:text(input.country,2).toUpperCase()}
    if(![1,3,12].includes(months)||!Number.isSafeInteger(quantity)||quantity<1||!address.name||!address.line1||!address.city||!address.region||!address.postalCode||address.country!=='IN'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\+?[0-9 ()-]{7,30}$/.test(phone)||body.acceptTerms!==true||!/^[A-Za-z0-9_-]{16,100}$/.test(body.idempotencyKey??''))return json({error:'Complete your contact details, address and automatic renewal consent.'},422)
    const now=Date.now(),id=`stripe_${hash(`${session.user.id}:${body.idempotencyKey}`).slice(0,32)}`,requestHash=hash(JSON.stringify({months,quantity,email,phone,address,code:text(body.discountCode,50)}))
    const existing=await db.prepare('SELECT * FROM stripe_checkouts WHERE id=? AND owner_id=?').bind(id,session.user.id).first<Record<string,any>>()
    if(existing&&existing.request_hash!==requestHash)return json({error:'Your order changed. Refresh checkout to start a new order.'},409)
    if(existing?.checkout_url&&existing.expires_at>now&&await db.prepare('SELECT id FROM orders WHERE subscription_id=?').bind(id).first())return json({url:existing.checkout_url})
    if(existing?.checkout_url&&existing.expires_at<=now)return json({error:'This checkout has expired. Refresh to start a new order.'},409)
    const selection={durationMonths:months,quantity,countryCode:'IN',userId:session.user.id,now}
    const quote=await calculatePricing(db,{...selection,discountCode:text(body.discountCode,50)}),renewal=await calculatePricing(db,selection)
    if(!quote||!renewal||quote.currency!=='INR'||quote.totalMinor<100||renewal.totalMinor<quote.totalMinor)return json({error:'This selection cannot be priced.'},422)
    if(existing&&(existing.first_amount_minor!==quote.totalMinor||existing.renewal_amount_minor!==renewal.totalMinor))return json({error:'Pricing changed. Refresh checkout before continuing.'},409)
    await registerCustomerCheckout(db,{id,userId:session.user.id,planId:`stripe_${months}`,planName:`${months} month`,durationMonths:months,quantity,currency:quote.currency,amountMinor:quote.totalMinor,pricingSnapshot:quote,now,createPendingPayment:false})
    await saveCustomerCheckoutDetails(db,{id,userId:session.user.id,email,address,now})
    await db.prepare("UPDATE customer_subscriptions SET payment_provider='stripe',contact_phone=?,renewal_amount_minor=?,renewal_enabled=1 WHERE id=?").bind(phone,renewal.totalMinor,id).run()
    await db.prepare('INSERT INTO stripe_checkouts(id,owner_id,request_hash,first_amount_minor,renewal_amount_minor,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,session.user.id,requestHash,quote.totalMinor,renewal.totalMinor,now).run()
    const origin=new URL(request.url).origin
    const params:Record<string,string>={mode:'subscription',success_url:`${origin}/order-complete?checkout_id=${id}`,cancel_url:`${origin}/checkout/stripe?duration=${months}&quantity=${quantity}&country=IN`,customer_email:email,client_reference_id:id,'metadata[local_subscription_id]':id,'subscription_data[metadata][local_subscription_id]':id,'subscription_data[metadata][owner_id]':session.user.id,'payment_method_types[0]':'card','line_items[0][price_data][currency]':'inr','line_items[0][price_data][unit_amount]':String(renewal.totalMinor),'line_items[0][price_data][recurring][interval]':'month','line_items[0][price_data][recurring][interval_count]':String(months),'line_items[0][price_data][product_data][name]':`Offscroll Times: ${months} month subscription (${quantity} ${quantity===1?'copy':'copies'} per edition)`,'line_items[0][quantity]':'1','consent_collection[terms_of_service]':'required','custom_text[terms_of_service_acceptance][message]':`I agree to the [Subscription Terms](${origin}/policies/subscription). Renews every ${months} ${months===1?'month':'months'} at INR ${(renewal.totalMinor/100).toFixed(2)} until cancelled.`}
    if(quote.totalMinor<renewal.totalMinor){const coupon=await stripeApi('/coupons',{duration:'once',amount_off:String(renewal.totalMinor-quote.totalMinor),currency:'inr',name:'First-term promotion'},`coupon-${id}`);params['discounts[0][coupon]']=coupon.id}
    const unavailable=()=>db.prepare("SELECT id FROM users WHERE owner_id=? AND account_state IN ('restricted','deleted')").bind(session.user.id).first()
    if(await unavailable())return json({error:'This account is no longer available.'},403)
    const checkout=await stripeApi('/checkout/sessions',params,`checkout-${id}`)
    if(await unavailable()){if(checkout.status!=='expired')await stripeApi(`/checkout/sessions/${encodeURIComponent(checkout.id)}/expire`,{},`account-closed-${id}`);return json({error:'This account is no longer available.'},403)}
    if(typeof checkout.url!=='string'||!checkout.url.startsWith('https://checkout.stripe.com/'))throw new Error('Invalid checkout URL')
    await db.prepare('UPDATE stripe_checkouts SET checkout_session_id=?,checkout_url=?,expires_at=? WHERE id=?').bind(checkout.id,checkout.url,Number(checkout.expires_at)*1000,id).run()
    if(!await db.prepare('SELECT id FROM orders WHERE subscription_id=?').bind(id).first())await recordCustomerOrder(db,{userId:session.user.id,email,phone,subscriptionId:id,providerOrderId:checkout.id,currency:quote.currency,amountMinor:quote.totalMinor,pricingSnapshot:quote,address,termsAcceptedAt:now})
    await db.prepare('UPDATE customers SET whatsapp_number=?,phone=?,updated_at=? WHERE user_id IN (SELECT id FROM users WHERE owner_id=?)').bind(phone,phone,now,session.user.id).run()
    return json({url:checkout.url})
  }catch{return json({error:'Stripe checkout could not be started. Please retry.'},503)}
}

export async function cancelStripeSubscription(db:D1Database,ownerId:string,id:string){
  const row=await db.prepare("SELECT stripe_subscription_id,payment_provider FROM customer_subscriptions WHERE id=? AND owner_id=?").bind(id,ownerId).first<{stripe_subscription_id:string|null;payment_provider:string}>()
  if(row?.payment_provider!=='stripe')return false
  if(!row.stripe_subscription_id)throw new Error('Checkout is not yet completed. Contact support to cancel a pending checkout.')
  await stripeApi(`/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`,{cancel_at_period_end:'true'},`cancel-${id}`)
  await db.prepare('UPDATE customer_subscriptions SET renewal_enabled=0,cancellation_requested_at=?,updated_at=? WHERE id=?').bind(Date.now(),Date.now(),id).run()
  await recordAccountEvent(db,{userId:ownerId,subscriptionId:id,eventType:'renewal_cancelled',title:'Automatic renewal cancelled',detail:'No new term will be charged. Your paid editions remain available.',now:Date.now()})
  return true
}

export async function applyStripeInvoice(db:D1Database,invoice:Record<string,any>,subscription:Record<string,any>){
  const id=subscription.metadata?.local_subscription_id
  const row=await db.prepare("SELECT * FROM customer_subscriptions WHERE id=? AND payment_provider='stripe'").bind(id??'').first<Record<string,any>>()
  if(!row||subscription.metadata?.owner_id!==row.owner_id)return
  if(await db.prepare("SELECT id FROM users WHERE owner_id=? AND account_state='deleted'").bind(row.owner_id).first())return
  if(await db.prepare("SELECT id FROM customer_payments WHERE provider_payment_id=? AND status='refunded'").bind(invoice.id).first())return
  const stripeId=providerId(invoice.parent?.subscription_details?.subscription??invoice.subscription)
  const item=subscription.items?.data?.[0],price=item?.price,interval=price?.recurring
  if(stripeId!==subscription.id||subscription.collection_method!=='charge_automatically'||interval?.interval!=='month'||interval.interval_count!==row.duration_months||subscription.items.data.length!==1||item.quantity!==1||price.unit_amount!==row.renewal_amount_minor||String(invoice.currency).toUpperCase()!==row.currency)throw new Error('Invoice does not match subscription')
  if(invoice.status!=='paid'||invoice.paid===false||!['subscription_create','subscription_cycle'].includes(invoice.billing_reason))return
  const expected=invoice.billing_reason==='subscription_create'?row.amount_minor:row.renewal_amount_minor
  if(invoice.amount_paid!==expected||invoice.amount_due!==expected||invoice.amount_remaining!==0)throw new Error('Paid amount does not match authorised term')
  const line=invoice.lines?.data?.find((line:Record<string,any>)=>line.parent?.subscription_item_details?.subscription_item===item.id||line.subscription_item===item.id)
  const start=Number(line?.period?.start)*1000,end=Number(line?.period?.end)*1000
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('Invalid invoice period')
  const now=Date.now(),paymentId=`stripe_${invoice.id}`,paidAt=Number(invoice.status_transitions?.paid_at??invoice.created)*1000
  const unprocessed="NOT EXISTS(SELECT 1 FROM customer_payments WHERE provider_payment_id=? AND status='paid')"
  await db.batch([
    db.prepare(`UPDATE customer_subscriptions SET stripe_subscription_id=?,stripe_customer_id=?,renewal_at=?,renewal_enabled=?,
      status=CASE WHEN ?=1 THEN 'cancelled' WHEN status='paused' THEN 'paused' ELSE 'active' END,entitlement_status='paid',
      starts_at=COALESCE(starts_at,?),ends_at=MAX(COALESCE(ends_at,0),?),paid_through_at=MAX(COALESCE(paid_through_at,0),?),
      next_dispatch_at=CASE WHEN starts_at IS NULL OR copies_fulfilled>=copies_total THEN ? ELSE next_dispatch_at END,
      copies_total=copies_total+CASE WHEN EXISTS(SELECT 1 FROM customer_payments WHERE subscription_id=? AND status='paid') THEN duration_months*quantity ELSE 0 END,updated_at=? WHERE id=? AND ${unprocessed}`)
      .bind(subscription.id,providerId(subscription.customer),Number(item.current_period_end??subscription.current_period_end??line.period.end)*1000,subscription.cancel_at_period_end?0:1,subscription.cancel_at_period_end?1:0,start,end,end,firstEditionTimestamp(paidAt),id,now,id,invoice.id),
    db.prepare(`INSERT INTO customer_payments(id,subscription_id,owner_id,provider_payment_id,status,amount_minor,currency,invoice_url,paid_at,pricing_snapshot_json,created_at,updated_at) VALUES(?,?,?,?,'paid',?,?,?,?,?,?,?) ON CONFLICT(provider_payment_id) WHERE provider_payment_id LIKE 'in_%' DO UPDATE SET status='paid',paid_at=excluded.paid_at,invoice_url=excluded.invoice_url,updated_at=excluded.updated_at`)
      .bind(paymentId,id,row.owner_id,invoice.id,expected,row.currency,invoice.hosted_invoice_url??null,paidAt,JSON.stringify({provider:'stripe',invoiceId:invoice.id,amountMinor:expected,currency:row.currency,durationMonths:row.duration_months,quantity:row.quantity,periodStart:start,periodEnd:end,billingReason:invoice.billing_reason}),now,now),
  ])
  {
    const snapshot=JSON.parse(row.pricing_snapshot_json??'{}')
    if(invoice.billing_reason==='subscription_create'&&snapshot.discountId)await db.prepare('INSERT INTO discount_redemptions(id,discount_id,subscription_id,owner_id,created_at) VALUES(?,?,?,?,?) ON CONFLICT(discount_id,subscription_id) DO NOTHING').bind(`redemption_${id}`,snapshot.discountId,id,row.owner_id,now).run()
    await db.prepare(`INSERT INTO account_events(id,owner_id,subscription_id,event_type,title,detail,effective_at,created_at) VALUES(?,?,?,'stripe_invoice_paid',?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(`stripe_event_${invoice.id}`,row.owner_id,id,invoice.billing_reason==='subscription_create'?'Subscription activated':'Subscription renewed automatically',`Stripe verified ${row.currency} ${(expected/100).toFixed(2)} for ${row.duration_months} monthly editions.`,end,now).run()
  }
}

/** Reconcile provider records using IDs saved at checkout; never trust browser payment claims. */
export async function syncStripePayments(db:D1Database,ownerId?:string,secret=process.env.STRIPE_SECRET_KEY){
  if(!secret)return
  const now=Date.now()
  const rows=await db.prepare(`SELECT s.id,s.owner_id,s.stripe_subscription_id,c.checkout_session_id FROM customer_subscriptions s JOIN stripe_checkouts c ON c.id=s.id WHERE s.payment_provider='stripe' AND c.checkout_session_id IS NOT NULL AND c.last_checked_at<? ${ownerId?'AND s.owner_id=?':''} ORDER BY c.last_checked_at LIMIT 10`).bind(now-15000,...(ownerId?[ownerId]:[])).all<Record<string,any>>()
  for(const row of rows.results){
    const claim=await db.prepare('UPDATE stripe_checkouts SET last_checked_at=? WHERE id=? AND last_checked_at<?').bind(now,row.id,now-15000).run()
    if(!claim.meta.changes)continue
    try{
      const checkout=await stripeApi(`/checkout/sessions/${encodeURIComponent(row.checkout_session_id)}`,undefined,undefined,secret)
      if(checkout.client_reference_id!==row.id||checkout.metadata?.local_subscription_id!==row.id||checkout.mode!=='subscription')throw new Error('Checkout ownership mismatch')
      const stripeId=providerId(checkout.subscription)
      if(!stripeId)continue
      const subscription=await stripeApi(`/subscriptions/${encodeURIComponent(stripeId)}`,undefined,undefined,secret)
      if(subscription.metadata?.local_subscription_id!==row.id||subscription.metadata?.owner_id!==row.owner_id||providerId(subscription.customer)!==providerId(checkout.customer))throw new Error('Subscription ownership mismatch')
      const invoices:Record<string,any>[]=[]
      let after=''
      for(let page=0;page<10;page++){
        const params=new URLSearchParams({subscription:stripeId,limit:'100'});if(after)params.set('starting_after',after)
        const list=await stripeApi(`/invoices?${params}`,undefined,undefined,secret)
        invoices.push(...list.data)
        if(!list.has_more)break
        if(page===9)throw new Error('Invoice history needs further reconciliation')
        after=list.data.at(-1).id
      }
      for(const invoice of invoices.sort((a,b)=>a.created-b.created))await applyStripeInvoice(db,invoice,subscription)
      const item=subscription.items?.data?.[0],ended=['canceled','unpaid','incomplete_expired'].includes(subscription.status),cancelled=subscription.cancel_at_period_end||ended
      await db.prepare(`UPDATE customer_subscriptions SET stripe_subscription_id=?,stripe_customer_id=?,renewal_at=?,renewal_enabled=?,status=CASE WHEN status='refunded' THEN status WHEN ?=1 THEN 'cancelled' ELSE status END,updated_at=? WHERE id=? AND owner_id=?`).bind(stripeId,providerId(subscription.customer),Number(item?.current_period_end??subscription.current_period_end??0)*1000,cancelled?0:1,cancelled?1:0,now,row.id,row.owner_id).run()
      // Completed subscriptions need periodic renewal reconciliation; abandoned checkouts do not.
      await db.prepare('UPDATE stripe_checkouts SET last_checked_at=? WHERE id=?').bind(now+(checkout.status==='expired'?86400000:subscription.status==='canceled'?3600000:240000),row.id).run()
    }catch{
      console.error('stripe_reconciliation_failed')
      // Leave the claim timestamp for a short retry rather than hiding the whole dashboard.
    }
  }
}

export async function stripeWebhook(request:Request){
  const raw=await request.text()
  if(!verifyStripeWebhook(raw,request.headers.get('stripe-signature')??''))return json({error:'Invalid signature.'},400)
  try{
    const event=JSON.parse(raw),db=lifecycleBindings().db
    if(typeof event.id!=='string'||typeof event.type!=='string')return json({error:'Invalid event.'},400)
    const existing=await db.prepare('SELECT processed_at FROM stripe_webhook_receipts WHERE event_id=?').bind(event.id).first<{processed_at:number|null}>()
    if(existing?.processed_at)return json({ok:true})
    await db.prepare('INSERT INTO stripe_webhook_receipts(event_id,event_type,received_at) VALUES(?,?,?) ON CONFLICT(event_id) DO NOTHING').bind(event.id,event.type,Date.now()).run()
    const object=event.data?.object
    if(['refund.created','refund.updated','refund.failed'].includes(event.type)){
      await recordStripeCancellationRefund(db,await stripeApi(`/refunds/${encodeURIComponent(object.id)}`))
    }else if(['invoice.paid','invoice.payment_succeeded'].includes(event.type)){
      const invoice=await stripeApi(`/invoices/${encodeURIComponent(object.id)}`),stripeId=providerId(invoice.parent?.subscription_details?.subscription??invoice.subscription)
      if(stripeId)await applyStripeInvoice(db,invoice,await stripeApi(`/subscriptions/${encodeURIComponent(stripeId)}`))
    }else if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
      const checkout=await stripeApi(`/checkout/sessions/${encodeURIComponent(object.id)}`)
      const stripeId=providerId(checkout.subscription)
      const row=await db.prepare('SELECT id,owner_id FROM stripe_checkouts WHERE checkout_session_id=?').bind(checkout.id).first<{id:string;owner_id:string}>()
      if(row&&stripeId&&checkout.client_reference_id===row.id&&checkout.metadata?.local_subscription_id===row.id){
        const subscription=await stripeApi(`/subscriptions/${encodeURIComponent(stripeId)}`)
        if(subscription.metadata?.owner_id!==row.owner_id||subscription.metadata?.local_subscription_id!==row.id)throw new Error('Checkout ownership mismatch')
        const invoiceId=providerId(checkout.invoice??subscription.latest_invoice)
        if(invoiceId)await applyStripeInvoice(db,await stripeApi(`/invoices/${encodeURIComponent(invoiceId)}`),subscription)
      }
    }else if(event.type.startsWith('customer.subscription.')){
      const subscription=await stripeApi(`/subscriptions/${encodeURIComponent(object.id)}`),id=subscription.metadata?.local_subscription_id
      if(id){const item=subscription.items?.data?.[0],cancelled=subscription.cancel_at_period_end||subscription.status==='canceled',ended=['canceled','unpaid','incomplete_expired'].includes(subscription.status)
        await db.prepare(`UPDATE customer_subscriptions SET stripe_subscription_id=?,stripe_customer_id=?,renewal_at=?,renewal_enabled=?,status=CASE WHEN status='refunded' THEN status WHEN ?=1 THEN 'cancelled' ELSE status END,updated_at=? WHERE id=? AND owner_id=? AND payment_provider='stripe'`).bind(subscription.id,providerId(subscription.customer),Number(item?.current_period_end??subscription.current_period_end??0)*1000,(cancelled||ended)?0:1,(cancelled||ended)?1:0,Date.now(),id,subscription.metadata.owner_id).run()
      }
    }else if(['invoice.payment_failed','invoice.payment_action_required'].includes(event.type)){
      const invoice=await stripeApi(`/invoices/${encodeURIComponent(object.id)}`),stripeId=providerId(invoice.parent?.subscription_details?.subscription??invoice.subscription)
      if(stripeId&&invoice.status!=='paid'){
        const subscription=await stripeApi(`/subscriptions/${encodeURIComponent(stripeId)}`),id=subscription.metadata?.local_subscription_id,row=await db.prepare('SELECT owner_id,currency,pricing_snapshot_json FROM customer_subscriptions WHERE id=? AND owner_id=?').bind(id??'',subscription.metadata?.owner_id??'').first<Record<string,any>>()
        if(row){await db.prepare(`INSERT INTO customer_payments(id,subscription_id,owner_id,provider_payment_id,status,amount_minor,currency,invoice_url,pricing_snapshot_json,created_at,updated_at) VALUES(?,?,?,?,'failed',?,?,?,?,?,?) ON CONFLICT(provider_payment_id) WHERE provider_payment_id LIKE 'in_%' DO NOTHING`).bind(`stripe_${invoice.id}`,id,row.owner_id,invoice.id,invoice.amount_due,row.currency,invoice.hosted_invoice_url??null,row.pricing_snapshot_json,Date.now(),Date.now()).run();await recordAccountEvent(db,{userId:row.owner_id,subscriptionId:id,eventType:'renewal_payment_attention',title:'Subscription payment needs attention',detail:'Stripe will retry eligible payments. Your bank may require authentication; check your Stripe invoice. Unpaid terms do not add editions.'})}
      }
    }
    await db.prepare('UPDATE stripe_webhook_receipts SET processed_at=? WHERE event_id=?').bind(Date.now(),event.id).run()
    return json({ok:true})
  }catch{return json({error:'Webhook processing failed. Stripe should retry.'},500)}
}
