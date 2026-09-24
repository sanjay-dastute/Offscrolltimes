import { firstEditionTimestamp } from '#/lib/dates'

export type CustomerAddress = {
  name: string
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode: string
  country: string
}

export type CustomerSubscription = {
  id: string
  planId: string
  planName: string
  durationMonths: number
  quantity: number
  status: string
  currency: string
  amountMinor: number
  contactEmail: string | null
  deliveryAddress: CustomerAddress | null
  startsAt: number | null
  endsAt: number | null
  nextDispatchAt: number | null
  copiesTotal: number
  copiesFulfilled: number
  copiesRemaining: number
  cancellationRequestedAt: number | null
  pausedAt: number | null
  entitlementStatus: string
  paidThroughAt: number | null
}

type SubscriptionRow = {
  id: string
  plan_id: string
  plan_name: string
  duration_months: number
  quantity: number
  status: string
  currency: string
  amount_minor: number
  contact_email: string | null
  delivery_address_json: string | null
  starts_at: number | null
  ends_at: number | null
  next_dispatch_at: number | null
  copies_total: number
  copies_fulfilled: number
  cancellation_requested_at: number | null
  paused_at: number | null
  entitlement_status: string
  paid_through_at: number | null
}

export type CustomerPayment = {
  id: string
  subscriptionId: string
  status: string
  amountMinor: number
  currency: string
  invoiceUrl: string | null
  paidAt: number | null
  createdAt: number
}

export type CustomerFulfilment = {
  id: string
  subscriptionId: string
  editionLabel: string
  status: string
  trackingUrl: string | null
  courier: string | null
  dispatchedAt: number | null
  deliveredAt: number | null
}

export type CustomerAccountEvent = {
  id: string; subscriptionId: string | null; eventType: string; title: string
  detail: string; effectiveAt: number | null; createdAt: number
}

export async function recordAccountEvent(db:D1Database,input:{userId:string;subscriptionId?:string|null;eventType:string;title:string;detail:string;effectiveAt?:number|null;now?:number}) {
  await db.prepare(`INSERT INTO account_events(id,owner_id,subscription_id,event_type,title,detail,effective_at,created_at) VALUES(?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),input.userId,input.subscriptionId??null,input.eventType,input.title,input.detail,input.effectiveAt??null,input.now??Date.now()).run()
}

function parseAddress(value: string | null): CustomerAddress | null {
  if (!value) return null
  try {
    return JSON.parse(value) as CustomerAddress
  } catch {
    return null
  }
}

function subscriptionFromRow(row: SubscriptionRow): CustomerSubscription {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    durationMonths: row.duration_months,
    quantity: row.quantity,
    status: row.status,
    currency: row.currency,
    amountMinor: row.amount_minor,
    contactEmail: row.contact_email,
    deliveryAddress: parseAddress(row.delivery_address_json),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    nextDispatchAt: row.next_dispatch_at,
    copiesTotal: row.copies_total,
    copiesFulfilled: row.copies_fulfilled,
    copiesRemaining: Math.max(0, row.copies_total - row.copies_fulfilled),
    cancellationRequestedAt: row.cancellation_requested_at,
    pausedAt: row.paused_at,
    entitlementStatus: row.entitlement_status,
    paidThroughAt: row.paid_through_at,
  }
}

export async function listCustomerSubscriptions(db: D1Database, userId: string) {
  const subscriptions = await db.prepare(
    `SELECT id, plan_id, plan_name, duration_months, quantity, status, currency,
            amount_minor, contact_email, delivery_address_json, starts_at, ends_at,
            next_dispatch_at, copies_total, copies_fulfilled,
            cancellation_requested_at, paused_at, entitlement_status, paid_through_at
       FROM customer_subscriptions WHERE owner_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all<SubscriptionRow>()
  const payments = await db.prepare(
    `SELECT id, subscription_id, status, amount_minor, currency, invoice_url, paid_at, created_at
       FROM customer_payments WHERE owner_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all<{
    id: string; subscription_id: string; status: string; amount_minor: number; currency: string
    invoice_url: string | null; paid_at: number | null; created_at: number
  }>()
  const fulfilments = await db.prepare(
    `SELECT id, subscription_id, edition_label, status, tracking_url, courier, dispatched_at, delivered_at
       FROM customer_fulfilments WHERE owner_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all<{
    id: string; subscription_id: string; edition_label: string; status: string
    tracking_url: string | null; courier: string | null; dispatched_at: number | null; delivered_at: number | null
  }>()
  const events = await db.prepare(`SELECT id,subscription_id,event_type,title,detail,effective_at,created_at FROM account_events WHERE owner_id=? ORDER BY created_at DESC LIMIT 100`)
    .bind(userId).all<{id:string;subscription_id:string|null;event_type:string;title:string;detail:string;effective_at:number|null;created_at:number}>()
  return {
    subscriptions: subscriptions.results.map(subscriptionFromRow),
    payments: payments.results.map((row): CustomerPayment => ({
      id: row.id, subscriptionId: row.subscription_id, status: row.status,
      amountMinor: row.amount_minor, currency: row.currency, invoiceUrl: row.invoice_url,
      paidAt: row.paid_at, createdAt: row.created_at,
    })),
    fulfilments: fulfilments.results.map((row): CustomerFulfilment => ({
      id: row.id, subscriptionId: row.subscription_id, editionLabel: row.edition_label,
      status: row.status, trackingUrl: row.tracking_url,
      courier: row.courier,
      dispatchedAt: row.dispatched_at, deliveredAt: row.delivered_at,
    })),
    events: events.results.map((row):CustomerAccountEvent=>({id:row.id,subscriptionId:row.subscription_id,eventType:row.event_type,title:row.title,detail:row.detail,effectiveAt:row.effective_at,createdAt:row.created_at})),
  }
}

export async function createPrivacyRequest(db:D1Database,userId:string,requestType:'access'|'deletion',now:number){
  const recent=await db.prepare(`SELECT id FROM customer_privacy_requests WHERE owner_id=? AND request_type=? AND status IN ('received','reviewing')`).bind(userId,requestType).first()
  if(recent)return 'existing'
  const id=crypto.randomUUID();await db.prepare(`INSERT INTO customer_privacy_requests(id,owner_id,request_type,status,created_at,updated_at) VALUES(?,?,?,'received',?,?)`).bind(id,userId,requestType,now,now).run();return id
}

export async function registerCustomerCheckout(db: D1Database, input: {
  id: string; userId: string; planId: string; planName: string; durationMonths: number
  quantity: number; currency: string; amountMinor: number; now: number; pricingSnapshot?: unknown
}) {
  await db.prepare(
    `INSERT INTO customer_subscriptions
      (id, owner_id, plan_id, plan_name, duration_months, quantity, status,
       currency, amount_minor, copies_total, renewal_enabled, pricing_snapshot_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, 1, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  ).bind(
    input.id, input.userId, input.planId, input.planName, input.durationMonths,
    input.quantity, input.currency, input.amountMinor, input.durationMonths * input.quantity,
    input.pricingSnapshot ? JSON.stringify(input.pricingSnapshot) : null,
    input.now, input.now,
  ).run()
  await db.prepare(
    `INSERT INTO customer_payments
      (id, subscription_id, owner_id, status, amount_minor, currency, pricing_snapshot_json, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
  ).bind(`payment_${input.id}`, input.id, input.userId, input.amountMinor, input.currency, input.pricingSnapshot ? JSON.stringify(input.pricingSnapshot) : null, input.now, input.now).run()
}

export async function saveCustomerCheckoutDetails(db: D1Database, input: {
  id: string; userId: string; email: string; address: CustomerAddress; now: number
}) {
  const owned = await db.prepare(
    `UPDATE customer_subscriptions SET contact_email = ?,
       delivery_address_json = ?, updated_at = ?
     WHERE id = ? AND owner_id = ? AND status IN ('upcoming', 'payment_failed')`,
  ).bind(input.email, JSON.stringify(input.address), input.now, input.id, input.userId).run()
  return (owned.meta.changes ?? 0) === 1
}

export async function applyCustomerPaymentSucceeded(db: D1Database, input: {
  id: string; payerUserId: string | null; paymentId: string | null; paidAt: number | null; now: number
}) {
  const paidAt = input.paidAt ?? input.now
  const nextDispatchAt=firstEditionTimestamp(paidAt,process.env.BUSINESS_TIME_ZONE||'Asia/Kolkata',Number(process.env.BUSINESS_CUTOFF_DAY||20))
  const subscriptionUpdate = db.prepare(
    `UPDATE customer_subscriptions SET status = 'active', entitlement_status = 'paid',
       starts_at = COALESCE(starts_at, ?),
       ends_at = COALESCE(ends_at, ? + duration_months * 2629800000),
       paid_through_at = COALESCE(paid_through_at, ? + duration_months * 2629800000),
       next_dispatch_at = COALESCE(next_dispatch_at, ?), updated_at = ?
     WHERE id = ? AND (? IS NULL OR owner_id = ?) AND status IN ('upcoming', 'payment_failed')`,
  ).bind(paidAt, paidAt, paidAt, nextDispatchAt, input.now, input.id, input.payerUserId, input.payerUserId)
  const paymentUpdate = db.prepare(
    `UPDATE customer_payments SET status = 'paid', provider_payment_id = ?, paid_at = ?, updated_at = ?
     WHERE subscription_id = ? AND (? IS NULL OR owner_id = ?)`,
  ).bind(input.paymentId, paidAt, input.now, input.id, input.payerUserId, input.payerUserId)
  const [owned] = await db.batch([subscriptionUpdate,paymentUpdate])
  if ((owned.meta.changes ?? 0) !== 1) return false
  const purchased = await db.prepare(`SELECT owner_id, pricing_snapshot_json FROM customer_subscriptions WHERE id=?`).bind(input.id).first<{owner_id:string;pricing_snapshot_json:string|null}>()
  if (purchased?.pricing_snapshot_json) {
    try {
      const snapshot=JSON.parse(purchased.pricing_snapshot_json) as {discountId?:string|null}
      if (snapshot.discountId) await db.prepare(`INSERT INTO discount_redemptions (id,discount_id,subscription_id,owner_id,created_at)
        VALUES (?,?,?,?,?) ON CONFLICT(discount_id,subscription_id) DO NOTHING`).bind(`redemption_${input.id}`,snapshot.discountId,input.id,purchased.owner_id,paidAt).run()
    } catch { /* A legacy snapshot must not block payment activation. */ }
  }
  if(purchased) await recordAccountEvent(db,{userId:purchased.owner_id,subscriptionId:input.id,eventType:'subscription_activated',title:'Subscription activated',detail:'Payment was verified and your prepaid subscription is active.',effectiveAt:nextDispatchAt,now:input.now})
  return true
}

export async function updateCustomerAddress(
  db: D1Database, userId: string, subscriptionId: string, address: CustomerAddress, now: number,
) {
  const result = await db.prepare(
    `UPDATE customer_subscriptions SET delivery_address_json = ?, updated_at = ?
     WHERE id = ? AND owner_id = ? AND status IN ('upcoming', 'active', 'paused', 'cancelled')`,
  ).bind(JSON.stringify(address), now, subscriptionId, userId).run()
  if((result.meta.changes??0)!==1)return false
  const effectiveAt=firstEditionTimestamp(now,process.env.BUSINESS_TIME_ZONE||'Asia/Kolkata',Number(process.env.BUSINESS_CUTOFF_DAY||20))
  await recordAccountEvent(db,{userId,subscriptionId,eventType:'address_changed',title:'Delivery address updated',detail:`The new address applies from the ${new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(effectiveAt))} edition.`,effectiveAt,now})
  return true
}

export async function requestCustomerAction(
  db: D1Database, userId: string, subscriptionId: string, action: 'pause' | 'resume' | 'cancel', now: number,
) {
  const target = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'cancelled'
  const result = await db.prepare(
    `UPDATE customer_subscriptions SET status = ?, renewal_enabled = CASE WHEN ? = 'cancel' THEN 0 ELSE renewal_enabled END, paused_at = ?, cancellation_requested_at = ?, updated_at = ?
     WHERE id = ? AND owner_id = ? AND status NOT IN ('completed', 'refunded')`,
  ).bind(
    target, action,
    action === 'pause' ? now : null,
    action === 'cancel' ? now : null,
    now, subscriptionId, userId,
  ).run()
  if((result.meta.changes??0)!==1)return false
  await recordAccountEvent(db,{userId,subscriptionId,eventType:`subscription_${target}`,title:`Subscription ${target.replace('_',' ')}`,detail:action==='cancel'?'Future unpaid renewal is stopped. Paid-copy entitlement remains subject to the cancellation policy.':`Your subscription is now ${target.replace('_',' ')}.`,now})
  return true
}
