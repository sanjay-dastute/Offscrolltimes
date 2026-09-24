import type { CustomerAddress } from '#/lib/customer/store.server'
import { recordAddressVersion } from '#/lib/canonical-data.server'
import { recordAccountEvent } from '#/lib/customer/store.server'
import { base64url } from '#/lib/codec'

const id = () => crypto.randomUUID()

export async function audit(db: D1Database, actor: string, action: string, targetType: string, targetId: string, summary: unknown) {
  const auditId=id(),createdAt=Date.now(),safeSummary=JSON.stringify(summary)
  await db.prepare(
    `INSERT INTO admin_audit_log (id, actor_user_id, action, target_type, target_id, summary_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(auditId, actor, action, targetType, targetId, safeSummary, createdAt).run()
  const previous=await db.prepare(`SELECT event_hash FROM security_audit_chain ORDER BY sequence DESC LIMIT 1`).first<{event_hash:string}>(),previousHash=previous?.event_hash??'GENESIS'
  const secret=process.env.AUDIT_CHAIN_SECRET||process.env.SESSION_SECRET
  if(!secret)throw new Error('Audit integrity key is unavailable.')
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const eventHash=base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${previousHash}|${auditId}|${actor}|${action}|${targetType}|${targetId}|${safeSummary}|${createdAt}`))))
  await db.prepare(`INSERT INTO security_audit_chain(audit_id,previous_hash,event_hash,created_at) VALUES(?,?,?,?)`).bind(auditId,previousHash,eventHash,createdAt).run()
}

export async function getAdminDashboard(db: D1Database) {
  const [subscriptions, payments, fulfilments, editions, eligibility, products, options, discounts, zones, content, enquiries, audits, promotionReports, analyticsEvents] = await Promise.all([
    db.prepare(`SELECT id, owner_id customer_id, plan_name, duration_months, quantity, status, currency,
      amount_minor, contact_email, contact_phone, delivery_address_json, starts_at, ends_at, paid_through_at,
      next_dispatch_at, copies_total, copies_fulfilled, entitlement_status, pricing_snapshot_json, created_at
      FROM customer_subscriptions ORDER BY created_at DESC LIMIT 500`).all(),
    db.prepare(`SELECT id, subscription_id, owner_id customer_id, provider_payment_id, status,
      amount_minor, currency, paid_at, created_at FROM customer_payments ORDER BY created_at DESC LIMIT 500`).all(),
    db.prepare(`SELECT id, subscription_id, owner_id customer_id, edition_label, status,
      tracking_url, dispatched_at, delivered_at, created_at FROM customer_fulfilments ORDER BY created_at DESC LIMIT 1000`).all(),
    db.prepare(`SELECT * FROM editions ORDER BY dispatch_at DESC LIMIT 100`).all(),
    db.prepare(`SELECT * FROM edition_eligibility_snapshots ORDER BY created_at DESC LIMIT 5000`).all(),
    db.prepare(`SELECT * FROM admin_products ORDER BY name`).all(),
    db.prepare(`SELECT * FROM admin_subscription_options ORDER BY duration_months`).all(),
    db.prepare(`SELECT * FROM admin_discounts ORDER BY created_at DESC`).all(),
    db.prepare(`SELECT * FROM admin_shipping_zones ORDER BY country_name`).all(),
    db.prepare(`SELECT * FROM admin_content ORDER BY content_key`).all(),
    db.prepare(`SELECT id, reference, enquiry_type, name, email, country, detail, message, status, staff_notes, email_sent, created_at, updated_at FROM contact_enquiries ORDER BY created_at DESC LIMIT 500`).all(),
    db.prepare(`SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 200`).all(),
    db.prepare(`SELECT d.id,d.code,COUNT(r.id) redemptions,
      COALESCE(SUM(CASE WHEN p.status='paid' THEN p.amount_minor ELSE 0 END),0) revenue_minor,
      COALESCE(SUM(CASE WHEN p.status='paid' THEN json_extract(s.pricing_snapshot_json,'$.offerDiscountMinor') ELSE 0 END),0) discount_cost_minor
      FROM admin_discounts d LEFT JOIN discount_redemptions r ON r.discount_id=d.id
      LEFT JOIN customer_subscriptions s ON s.id=r.subscription_id LEFT JOIN customer_payments p ON p.subscription_id=s.id
      GROUP BY d.id,d.code ORDER BY redemptions DESC`).all(),
    db.prepare(`SELECT event_name,COUNT(*) total FROM first_party_analytics_events GROUP BY event_name`).all(),
  ])
  const rows = subscriptions.results as Array<Record<string, unknown>>
  const paymentRows = payments.results as Array<{ status: string; amount_minor: number }>
  const fulfilmentRows = fulfilments.results as Array<{ subscription_id: string; edition_label: string; status: string }>
  const editionRows = editions.results as Array<{ label: string; dispatch_at: number; status: string }>
  const now = Date.now()
  const expirationWindow = now + 30 * 24 * 60 * 60 * 1000
  const revenue = paymentRows.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount_minor), 0)
  const refunds = paymentRows.filter(p => p.status === 'refunded')
  const nextEditionRow = editionRows
    .filter(row => Number(row.dispatch_at) >= now && row.status !== 'completed')
    .sort((a, b) => Number(a.dispatch_at) - Number(b.dispatch_at))[0]
  const subscriptionById = new Map(rows.map(row => [String(row.id), row]))
  const nextEditionFulfilments = nextEditionRow
    ? fulfilmentRows.filter(row => row.edition_label === nextEditionRow.label && ['scheduled', 'prepared'].includes(row.status))
    : []
  const countryCounts = new Map<string, { subscriptions: number; copies: number }>()
  for (const row of rows) {
    const address = parseAddress(row.delivery_address_json)
    if (!address?.country) continue
    const country = address.country.toUpperCase()
    const current = countryCounts.get(country) ?? { subscriptions: 0, copies: 0 }
    current.subscriptions += 1
    current.copies += Number(row.quantity ?? 1)
    countryCounts.set(country, current)
  }
  const promotionRows = promotionReports.results as Array<{ redemptions: number; discount_cost_minor: number }>
  const analytics = Object.fromEntries((analyticsEvents.results as Array<{event_name:string;total:number}>).map(row => [row.event_name, Number(row.total)]))
  const paidEntitled = rows.filter(row => row.entitlement_status === 'paid' && Number(row.copies_fulfilled) < Number(row.copies_total))
  const dispatchedByCountry = new Map<string, number>()
  for (const fulfilment of fulfilmentRows.filter(row => ['dispatched','delivered','delayed','returned','replacement'].includes(row.status))) {
    const subscription = subscriptionById.get(fulfilment.subscription_id)
    const country = parseAddress(subscription?.delivery_address_json)?.country?.toUpperCase()
    if (country) dispatchedByCountry.set(country, (dispatchedByCountry.get(country) ?? 0) + Number(subscription?.quantity ?? 1))
  }
  return {
    subscriptions: rows.map(row => ({
      ...row,
      delivery_address: parseAddress(row.delivery_address_json),
      pricing_snapshot: parseJsonRecord(row.pricing_snapshot_json),
      delivery_address_json: undefined,
      pricing_snapshot_json: undefined,
    })),
    payments: payments.results,
    fulfilments: fulfilments.results,
    editions: editions.results,
    eligibility: eligibility.results,
    products: products.results,
    options: options.results,
    discounts: discounts.results,
    zones: zones.results,
    content: content.results,
    enquiries: enquiries.results,
    promotionReports: promotionReports.results,
    audits: audits.results,
    reports: {
      customers: new Set(rows.map(row => row.customer_id)).size,
      activeSubscriptions: rows.filter(row => row.status === 'active').length,
      activePaidEntitlements: paidEntitled.length,
      entitledCopiesRemaining: paidEntitled.reduce((sum,row)=>sum+Math.max(0,Number(row.copies_total)-Number(row.copies_fulfilled)),0),
      upcomingExpirations: rows.filter(row => ['active', 'paused', 'cancelled'].includes(String(row.status)) && Number(row.ends_at) >= now && Number(row.ends_at) <= expirationWindow).length,
      cancellations: rows.filter(row => row.status === 'cancelled').length,
      completedTerms: rows.filter(row => row.status === 'completed').length,
      renewals: rows.length - new Set(rows.map(row => row.customer_id)).size,
      retentionPercent: rows.length ? Math.round((rows.filter(row => ['active','paused','cancelled'].includes(String(row.status)) && Number(row.copies_fulfilled)<Number(row.copies_total)).length / rows.length) * 100) : 0,
      addressExceptions: rows.filter(row => {
        const address = parseAddress(row.delivery_address_json)
        return !address?.name || !address.line1 || !address.city || !address.postalCode || !address.country
      }).length,
      paymentExceptions: paymentRows.filter(row => row.status === 'failed' || row.status === 'pending').length,
      fulfilmentExceptions: fulfilmentRows.filter(row => row.status === 'replacement' || (['scheduled', 'prepared'].includes(row.status) && editionRows.some(edition => edition.label === row.edition_label && Number(edition.dispatch_at) < now))).length,
      deliveryExceptions: fulfilmentRows.filter(row => row.status === 'delayed' || row.status === 'returned').length,
      paidRevenueMinor: revenue,
      refundedPayments: refunds.length,
      refundedMinor: refunds.reduce((sum, row) => sum + Number(row.amount_minor), 0),
      discountRedemptions: promotionRows.reduce((sum, row) => sum + Number(row.redemptions), 0),
      discountCostMinor: promotionRows.reduce((sum, row) => sum + Number(row.discount_cost_minor), 0),
      nextEdition: nextEditionRow ? {
        label: nextEditionRow.label,
        dispatchAt: Number(nextEditionRow.dispatch_at),
        copiesRequired: nextEditionFulfilments.reduce((sum, row) => sum + Number(subscriptionById.get(row.subscription_id)?.quantity ?? 1), 0),
        eligibilityGenerated: nextEditionFulfilments.length > 0,
      } : null,
      countryDistribution: Array.from(countryCounts, ([country, totals]) => ({ country, ...totals })).sort((a, b) => b.subscriptions - a.subscriptions),
      fulfilmentByCountry: Array.from(countryCounts, ([country, totals]) => ({ country, required: totals.copies, dispatched: dispatchedByCountry.get(country) ?? 0 })),
      funnel: { pageViews: analytics.page_view ?? 0, durationSelections: analytics.duration_selected ?? 0, checkoutStarts: analytics.checkout_started ?? 0, successfulPurchases: paymentRows.filter(row=>row.status==='paid').length, paymentFailures: paymentRows.filter(row=>row.status==='failed').length },
    },
  }
}

export async function updateEnquiry(db: D1Database, actor: string, enquiryId: string, status: string, staffNotes: string) {
  const result = await db.prepare(`UPDATE contact_enquiries SET status = ?, staff_notes = ?, updated_at = ? WHERE id = ?`)
    .bind(status, staffNotes, Date.now(), enquiryId).run()
  if ((result.meta.changes ?? 0) !== 1) return false
  await audit(db, actor, 'enquiry.updated', 'enquiry', enquiryId, { status, hasStaffNotes: Boolean(staffNotes) })
  return true
}

function parseAddress(value: unknown): CustomerAddress | null {
  if (typeof value !== 'string') return null
  try { return JSON.parse(value) as CustomerAddress } catch { return null }
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch { return null }
}

export async function createEdition(db: D1Database, actor: string, input: { label: string; issueNumber: number; cutoff: number; dispatch: number }) {
  const editionId = `edition_${input.issueNumber}`
  await db.prepare(`INSERT INTO editions (id, label, issue_number, eligibility_cutoff_at, dispatch_at, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`).bind(editionId, input.label, input.issueNumber, input.cutoff, input.dispatch, Date.now(), Date.now()).run()
  await audit(db, actor, 'edition.created', 'edition', editionId, input)
  return editionId
}

export async function generateEditionEligibility(db: D1Database, actor: string, editionId: string) {
  const edition = await db.prepare(`SELECT id, label, eligibility_cutoff_at, status FROM editions WHERE id = ?`).bind(editionId).first<{ id: string; label: string; eligibility_cutoff_at: number; status: string }>()
  // This is a frozen point-in-time business record. Corrections happen through
  // documented overrides; regenerating it would destroy the original decision.
  if (!edition || edition.status !== 'draft') return null
  const subscriptions = await db.prepare(`SELECT id, owner_id, status, entitlement_status, copies_total, copies_fulfilled,
    starts_at, ends_at, paid_through_at, delivery_address_json FROM customer_subscriptions ORDER BY created_at`).all<Record<string, unknown>>()
  const now = Date.now()
  let included = 0, excluded = 0
  for (const row of subscriptions.results) {
    const address = parseAddress(row.delivery_address_json)
    const alreadyAssigned = await db.prepare(`SELECT id FROM customer_fulfilments WHERE subscription_id = ? AND edition_label = ?`).bind(row.id, edition.label).first()
    const paid = await db.prepare(`SELECT id FROM customer_payments WHERE subscription_id = ? AND status = 'paid'`).bind(row.id).first()
    let reason = 'Eligible paid entitlement'
    if (row.status === 'paused') reason = 'Subscription is paused'
    else if (row.status === 'refunded') reason = 'Subscription is refunded'
    else if (row.status === 'completed' || Number(row.copies_fulfilled) >= Number(row.copies_total)) reason = 'Paid copy entitlement is exhausted'
    else if (row.status === 'cancelled' && process.env.FULFIL_PAID_AFTER_CANCELLATION !== 'true') reason = 'Post-cancellation paid fulfilment is disabled by policy'
    else if (!['active','cancelled'].includes(String(row.status))) reason = `Subscription status is ${row.status}`
    else if (row.entitlement_status !== 'paid' || !paid) reason = 'No confirmed paid entitlement'
    else if (Number(row.starts_at ?? 0) > edition.eligibility_cutoff_at) reason = 'Subscription starts after the edition cut-off'
    else if (row.paid_through_at && Number(row.paid_through_at) < edition.eligibility_cutoff_at) reason = 'Paid term expired before the edition cut-off'
    else if (!address?.name || !address.line1 || !address.city || !address.postalCode || !address.country) reason = 'Delivery address is incomplete'
    else if (alreadyAssigned) reason = 'Edition already assigned to this subscription'
    const decision = reason === 'Eligible paid entitlement' ? 'included' : 'excluded'
    await db.prepare(`INSERT INTO edition_eligibility_snapshots (id,edition_id,subscription_id,decision,reason,created_at) VALUES(?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(),editionId,row.id,decision,reason,now).run()
    if (decision === 'included') {
      included++
      await db.prepare(`INSERT INTO customer_fulfilments
      (id, subscription_id, owner_id, edition_label, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'scheduled', ?, ?) ON CONFLICT(subscription_id, edition_label) DO NOTHING`)
      .bind(`${edition.id}_${row.id}`, row.id, row.owner_id, edition.label, now, now).run()
    } else excluded++
  }
  await db.prepare(`UPDATE editions SET status = 'eligibility_generated', updated_at = ? WHERE id = ?`).bind(now, editionId).run()
  await audit(db, actor, 'edition.eligibility_generated', 'edition', editionId, { included, excluded })
  return included
}

export async function overrideEditionEligibility(db:D1Database,actor:string,editionId:string,subscriptionId:string,include:boolean,reason:string) {
  const edition=await db.prepare(`SELECT label,status FROM editions WHERE id=?`).bind(editionId).first<{label:string;status:string}>()
  const subscription=await db.prepare(`SELECT owner_id FROM customer_subscriptions WHERE id=?`).bind(subscriptionId).first<{owner_id:string}>()
  if(!edition||!subscription||edition.status!=='eligibility_generated')return false
  const now=Date.now(),decision=include?'override_included':'override_excluded'
  const result=await db.prepare(`UPDATE edition_eligibility_snapshots SET decision=?,reason=?,reviewed_by=?,reviewed_at=? WHERE edition_id=? AND subscription_id=?`).bind(decision,reason,actor,now,editionId,subscriptionId).run()
  if((result.meta.changes??0)!==1)return false
  if(include)await db.prepare(`INSERT INTO customer_fulfilments(id,subscription_id,owner_id,edition_label,status,created_at,updated_at) VALUES(?,?,?,?, 'scheduled',?,?) ON CONFLICT(subscription_id,edition_label) DO NOTHING`).bind(`${editionId}_${subscriptionId}`,subscriptionId,subscription.owner_id,edition.label,now,now).run()
  else await db.prepare(`DELETE FROM customer_fulfilments WHERE subscription_id=? AND edition_label=? AND status='scheduled'`).bind(subscriptionId,edition.label).run()
  await audit(db,actor,'edition.eligibility_overridden','edition',editionId,{subscriptionId,decision,reason})
  return true
}

export async function lockEdition(db:D1Database,actor:string,editionId:string,reason:string){
  const result=await db.prepare(`UPDATE editions SET status='locked',updated_at=? WHERE id=? AND status='eligibility_generated'`).bind(Date.now(),editionId).run()
  if((result.meta.changes??0)!==1)return false
  await audit(db,actor,'edition.fulfilment_list_locked','edition',editionId,{reason})
  return true
}

export async function updateFulfilment(db: D1Database, actor: string, fulfilmentId: string, status: string, trackingUrl?: string, courier?: string) {
  const now = Date.now()
  const courierName = courier || (trackingUrl ? new URL(trackingUrl).hostname.replace(/^www\./,'') : '')
  const previous = await db.prepare(`SELECT dispatched_at FROM customer_fulfilments WHERE id = ?`).bind(fulfilmentId).first<{ dispatched_at: number | null }>()
  if (!previous) return false
  const context = await db.prepare(`SELECT f.status previous_status,f.subscription_id,f.edition_label,e.id edition_id,e.status edition_status,s.owner_id FROM customer_fulfilments f JOIN editions e ON e.label=f.edition_label JOIN customer_subscriptions s ON s.id=f.subscription_id WHERE f.id=?`).bind(fulfilmentId).first<{previous_status:string;subscription_id:string;edition_label:string;edition_id:string;edition_status:string;owner_id:string}>()
  if(!context || !['locked','dispatched','completed'].includes(context.edition_status)) return false
  const allowed:Record<string,string[]>={scheduled:['prepared'],prepared:['dispatched'],dispatched:['delivered','delayed','returned'],delayed:['delivered','returned','replacement'],returned:['replacement'],replacement:['prepared']}
  if(!allowed[context.previous_status]?.includes(status))return false
  const result = await db.prepare(`UPDATE customer_fulfilments SET status = ?, tracking_url = ?, courier = COALESCE(?, courier),
    dispatched_at = CASE WHEN ? = 'dispatched' THEN COALESCE(dispatched_at, ?) ELSE dispatched_at END,
    delivered_at = CASE WHEN ? = 'delivered' THEN COALESCE(delivered_at, ?) ELSE delivered_at END,
    updated_at = ? WHERE id = ?`).bind(status, trackingUrl || null, courierName || null, status, now, status, now, now, fulfilmentId).run()
  if ((result.meta.changes ?? 0) !== 1) return false
  if (status === 'dispatched' && previous.dispatched_at === null) {
    await db.prepare(`UPDATE customer_subscriptions SET copies_fulfilled = MIN(copies_total, copies_fulfilled + quantity), updated_at = ?
      WHERE id = (SELECT subscription_id FROM customer_fulfilments WHERE id = ?)`).bind(now, fulfilmentId).run()
    await db.prepare(`UPDATE customer_subscriptions SET
      status = CASE WHEN copies_fulfilled >= copies_total THEN 'completed' ELSE status END,
      entitlement_status = CASE WHEN copies_fulfilled >= copies_total THEN 'exhausted' ELSE entitlement_status END,
      updated_at = ? WHERE id = (SELECT subscription_id FROM customer_fulfilments WHERE id = ?)`)
      .bind(now, fulfilmentId).run()
  }
  await audit(db, actor, 'fulfilment.status_changed', 'fulfilment', fulfilmentId, { status, trackingUrl: Boolean(trackingUrl) })
  if(['prepared','dispatched','delivered','delayed','returned','replacement'].includes(status))await db.prepare(`INSERT INTO shipments(id,fulfilment_id,subscription_id,courier,tracking_url,status,event_at,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),fulfilmentId,context.subscription_id,courierName||null,trackingUrl||null,status,now,now).run()
  await audit(db, actor, 'edition.fulfilment_status_changed', 'edition', context.edition_id, { fulfilmentId, from:context.previous_status, to:status, trackingUrl:Boolean(trackingUrl) })
  await recordAccountEvent(db,{userId:context.owner_id,subscriptionId:context.subscription_id,eventType:`fulfilment_${status}`,title:`${context.edition_label}: ${status}`,detail:`Edition status changed to ${status}.${courierName?` Courier: ${courierName}.`:''}${trackingUrl?' Tracking is available in your account.':''}`,now})
  if(status==='dispatched'){const completed=await db.prepare(`SELECT status FROM customer_subscriptions WHERE id=?`).bind(context.subscription_id).first<{status:string}>();if(completed?.status==='completed')await recordAccountEvent(db,{userId:context.owner_id,subscriptionId:context.subscription_id,eventType:'subscription_completed',title:'Subscription completed',detail:'All copies in this prepaid term have been fulfilled. Renewal is manual.',now})}
  return true
}

export async function updateSubscriptionStatus(db: D1Database, actor: string, subscriptionId: string, status: string, reason: string) {
  const previous = await db.prepare(`SELECT status,owner_id FROM customer_subscriptions WHERE id = ?`).bind(subscriptionId).first<{ status: string;owner_id:string }>()
  if (!previous) return false
  const allowed: Record<string, string[]> = { upcoming: ['active','paused','cancelled'], active: ['paused','cancelled','completed'], paused: ['active','cancelled','completed'], cancelled: ['active','completed'], payment_failed: ['upcoming','cancelled'], completed: [], refunded: [] }
  if (!allowed[previous.status]?.includes(status)) return false
  const now = Date.now()
  const result = await db.prepare(`UPDATE customer_subscriptions SET status = ?, paused_at = CASE WHEN ? = 'paused' THEN ? ELSE paused_at END,
    cancellation_requested_at = CASE WHEN ? = 'cancelled' THEN ? ELSE cancellation_requested_at END, updated_at = ? WHERE id = ?`)
    .bind(status, status, now, status, now, now, subscriptionId).run()
  if ((result.meta.changes ?? 0) !== 1) return false
  await audit(db, actor, 'subscription.status_changed', 'subscription', subscriptionId, { from: previous.status, to: status, reason })
  await recordAccountEvent(db,{userId:previous.owner_id,subscriptionId,eventType:`subscription_${status}`,title:`Subscription ${status.replace('_',' ')}`,detail:`Status updated by support. ${reason}`,now})
  return true
}

export async function updateAdminAddress(db: D1Database, actor: string, subscriptionId: string, address: CustomerAddress, reason: string) {
  const previous = await db.prepare(`SELECT delivery_address_json,contact_email,owner_id FROM customer_subscriptions WHERE id = ?`).bind(subscriptionId).first<{ delivery_address_json: string | null;contact_email:string|null;owner_id:string }>()
  if (!previous) return false
  const result = await db.prepare(`UPDATE customer_subscriptions SET delivery_address_json = ?, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify(address), Date.now(), subscriptionId).run()
  if ((result.meta.changes ?? 0) !== 1) return false
  await audit(db, actor, 'subscription.address_corrected', 'subscription', subscriptionId, { reason, previous: parseAddress(previous.delivery_address_json), updated: address })
  await recordAddressVersion(db,{ownerId:previous.owner_id,address,reason:`Administrator correction: ${reason}`,now:Date.now()})
  await recordAccountEvent(db,{userId:previous.owner_id,subscriptionId,eventType:'address_changed',title:'Delivery address corrected',detail:`Support updated the delivery address. ${reason}`,now:Date.now()})
  return true
}

export async function upsertCatalog(db: D1Database, actor: string, kind: string, body: Record<string, unknown>) {
  const now = Date.now()
  if (kind === 'product') {
    await db.prepare(`INSERT INTO admin_products (id, name, description, active, base_monthly_minor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
      active=excluded.active, base_monthly_minor=excluded.base_monthly_minor, updated_at=excluded.updated_at`)
      .bind(body.id, body.name, body.description, body.active ? 1 : 0, body.baseMonthlyMinor, now, now).run()
  } else if (kind === 'option') {
    await db.prepare(`INSERT INTO admin_subscription_options (id, product_id, name, duration_months, amount_minor, currency, active, discount_basis_points, created_at, updated_at)
      VALUES (?, 'puzzle-post', ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, duration_months=excluded.duration_months,
      amount_minor=excluded.amount_minor, currency=excluded.currency, active=excluded.active, discount_basis_points=excluded.discount_basis_points, updated_at=excluded.updated_at`)
      .bind(body.id, body.name, body.durationMonths, body.amountMinor, body.currency, body.active ? 1 : 0, body.discountBasisPoints, now, now).run()
  } else if (kind === 'discount') {
    await db.prepare(`INSERT INTO admin_discounts (id, code, kind, value, starts_at, ends_at, usage_limit, active,
      eligible_durations_json, eligible_countries_json, per_customer_limit, minimum_duration_months, minimum_order_minor,
      combinable_with_duration_discount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,
      kind=excluded.kind,value=excluded.value,starts_at=excluded.starts_at,ends_at=excluded.ends_at,usage_limit=excluded.usage_limit,
      active=excluded.active,eligible_durations_json=excluded.eligible_durations_json,eligible_countries_json=excluded.eligible_countries_json,
      per_customer_limit=excluded.per_customer_limit,minimum_duration_months=excluded.minimum_duration_months,
      minimum_order_minor=excluded.minimum_order_minor,combinable_with_duration_discount=excluded.combinable_with_duration_discount,
      updated_at=excluded.updated_at`)
      .bind(body.id, body.code, body.kind, body.value, body.startsAt, body.endsAt, body.usageLimit, body.active ? 1 : 0,
        body.eligibleDurations, body.eligibleCountries, body.perCustomerLimit, body.minimumDurationMonths, body.minimumOrderMinor,
        body.combinable ? 1 : 0, now, now).run()
  } else if (kind === 'shipping') {
    await db.prepare(`INSERT INTO admin_shipping_zones (country_code, country_name, currency, shipping_minor, tax_rate_basis_points, active, additional_copy_minor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(country_code) DO UPDATE SET country_name=excluded.country_name, currency=excluded.currency,
      shipping_minor=excluded.shipping_minor, tax_rate_basis_points=excluded.tax_rate_basis_points, additional_copy_minor=excluded.additional_copy_minor, active=excluded.active, updated_at=excluded.updated_at`)
      .bind(body.countryCode, body.countryName, body.currency, body.shippingMinor, body.taxRateBasisPoints, body.active ? 1 : 0, body.additionalCopyMinor, now, now).run()
  } else return false
  await audit(db, actor, `catalog.${kind}.upserted`, kind, String(body.id ?? body.countryCode), { ...body, sensitive: undefined })
  return true
}

export async function upsertContent(db: D1Database, actor: string, key: string, title: string, body: string) {
  await db.prepare(`INSERT INTO admin_content (content_key, title, body, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(content_key) DO UPDATE SET title=excluded.title, body=excluded.body, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .bind(key, title, body, actor, Date.now()).run()
  await audit(db, actor, 'content.updated', 'content', key, { title })
}

export async function dispatchRows(db: D1Database, editionId: string) {
  const edition = await db.prepare(`SELECT label,status FROM editions WHERE id = ?`).bind(editionId).first<{ label: string; status:string }>()
  if (!edition || !['locked','dispatched','completed'].includes(edition.status)) return null
  const rows = await db.prepare(`SELECT f.id fulfilment_id, f.edition_label, s.contact_email, s.quantity, s.delivery_address_json
    FROM customer_fulfilments f JOIN customer_subscriptions s ON s.id = f.subscription_id
    WHERE f.edition_label = ? AND f.status IN ('scheduled','prepared') ORDER BY s.id`).bind(edition.label).all<{
      fulfilment_id: string; edition_label: string; contact_email: string | null; quantity: number; delivery_address_json: string
    }>()
  return rows.results.map(row => ({ ...row, address: parseAddress(row.delivery_address_json), delivery_address_json: undefined }))
}
