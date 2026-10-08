import { readSession } from '#/lib/auth.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { isSameOrigin } from '#/lib/security'
import { json } from '#/lib/http.server'
import { calculatePricing } from '#/lib/pricing.server'
import { applyCustomerPaymentSucceeded, registerCustomerCheckout, saveCustomerCheckoutDetails, type CustomerAddress } from '#/lib/customer/store.server'
import { createRazorpayPlan, createRazorpaySubscription, razorpayPublicKey, retrieveRazorpayPayment, RazorpayApiError, verifySubscriptionSignature } from '#/lib/razorpay.server'
import { recordCustomerOrder } from '#/lib/canonical-data.server'
import { allowRequest } from '#/lib/rate-limit.server'

const safe = (value: unknown, length = 160) => typeof value === 'string' ? value.trim().slice(0, length) : ''
const database = () => { try { return lifecycleBindings().db } catch { return null } }
const billingPeriod = (months: number): 'monthly' | 'quarterly' | 'yearly' | null => months === 1 ? 'monthly' : months === 3 ? 'quarterly' : months === 12 ? 'yearly' : null
const recurringCycleCount = 120

function parseAddress(value: unknown): CustomerAddress | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const parsed = { name: safe(row.name, 100), line1: safe(row.line1), line2: safe(row.line2) || undefined, city: safe(row.city, 100), region: safe(row.region, 100) || undefined, postalCode: safe(row.postalCode, 24), country: safe(row.country, 2).toUpperCase() }
  return parsed.name && parsed.line1 && parsed.city && parsed.region && parsed.postalCode && /^[A-Z]{2}$/.test(parsed.country) ? parsed : null
}

export async function razorpaySubscriptionCheckout(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Forbidden.' }, 403)
  const session = await readSession(request)
  if (!session) return json({ error: 'Sign in before checkout.' }, 401)
  const db = database()
  if (!db) return json({ error: 'Checkout storage is unavailable.' }, 503)
  const body = await request.json() as Record<string, unknown>
  if (body.csrf !== session.csrf) return json({ error: 'Session changed.' }, 403)
  if (!await allowRequest(request, 'razorpay_subscription_checkout', 12, 10 * 60 * 1000, session.user.id)) return json({ error: 'Too many checkout attempts. Try again shortly.' }, 429)

  if (body.action === 'create') {
    const durationMonths = Number(body.durationMonths)
    const quantity = Number(body.quantity)
    const delivery = parseAddress(body.address)
    const email = safe(body.email, 200).toLowerCase()
    const phone = safe(body.phone, 30)
    const idempotencyKey = safe(body.idempotencyKey, 100)
    const period = billingPeriod(durationMonths)
    if (!period || !delivery || !/^\+?[0-9 ()-]{7,30}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.acceptTerms !== true || !/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) return json({ error: 'Complete contact, address and accept the terms.' }, 422)
    const quote = await calculatePricing(db, { durationMonths, quantity, countryCode: delivery.country, discountCode: safe(body.discountCode, 50), referralCode: safe(body.referralCode, 50), userId: session.user.id, now: Date.now() })
    if (!quote || quote.totalMinor < 100) return json({ error: 'This selection cannot be priced.' }, 422)
    const previous = await db.prepare(`SELECT r.razorpay_order_id,r.amount_minor,r.currency,r.pricing_snapshot_json FROM razorpay_orders r WHERE r.owner_id=? AND r.idempotency_key=?`).bind(session.user.id, idempotencyKey).first<{ razorpay_order_id: string; amount_minor: number; currency: string; pricing_snapshot_json: string }>()
    if (previous) return json({ ok: true, keyId: razorpayPublicKey(), subscriptionId: previous.razorpay_order_id, amount: previous.amount_minor, currency: previous.currency, quote: JSON.parse(previous.pricing_snapshot_json), reused: true })

    const localSubscriptionId = `rzp_${idempotencyKey}`
    const now = Date.now()
    await registerCustomerCheckout(db, { id: localSubscriptionId, userId: session.user.id, planId: `razorpay_${durationMonths}`, planName: `${durationMonths} month`, durationMonths, quantity, currency: quote.currency, amountMinor: quote.totalMinor, pricingSnapshot: quote, now })
    await saveCustomerCheckoutDetails(db, { id: localSubscriptionId, userId: session.user.id, email, address: delivery, now })
    await db.prepare(`UPDATE customer_subscriptions SET contact_phone=?,renewal_enabled=1,renewal_at=?,renewal_amount_minor=? WHERE id=?`).bind(phone, now + durationMonths * 2629800000, quote.totalMinor, localSubscriptionId).run()
    try {
      const plan = await createRazorpayPlan({ period, amount: quote.totalMinor, currency: quote.currency, name: `Offscroll Times ${durationMonths}-month subscription`, description: `${quantity} copy/copies per edition, billed every ${durationMonths} month(s).`, notes: { local_subscription_id: localSubscriptionId, duration_months: String(durationMonths) } })
      const provider = await createRazorpaySubscription({ planId: String(plan.id), totalCount: recurringCycleCount, notes: { local_subscription_id: localSubscriptionId, user_id: session.user.id } })
      if (typeof provider.id !== 'string' || typeof plan.id !== 'string') return json({ error: 'Payment service returned an invalid subscription.' }, 502)
      await db.batch([
        db.prepare(`INSERT INTO razorpay_orders(id,subscription_id,owner_id,razorpay_order_id,status,amount_minor,currency,pricing_snapshot_json,terms_accepted_at,created_at,updated_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), localSubscriptionId, session.user.id, provider.id, 'created', quote.totalMinor, quote.currency, JSON.stringify(quote), now, now, now, idempotencyKey),
        db.prepare(`INSERT INTO razorpay_recurring_subscriptions(id,subscription_id,owner_id,razorpay_subscription_id,razorpay_plan_id,status,billing_period,cycle_amount_minor,currency,total_count,next_charge_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), localSubscriptionId, session.user.id, provider.id, plan.id, String(provider.status ?? 'created'), period, quote.totalMinor, quote.currency, recurringCycleCount, Number(provider.charge_at ?? 0) * 1000 || null, now, now),
      ])
      await recordCustomerOrder(db, { userId: session.user.id, email, phone, subscriptionId: localSubscriptionId, providerOrderId: provider.id, currency: quote.currency, amountMinor: quote.totalMinor, pricingSnapshot: quote, address: delivery, termsAcceptedAt: now })
      return json({ ok: true, keyId: razorpayPublicKey(), subscriptionId: provider.id, amount: quote.totalMinor, currency: quote.currency, quote })
    } catch (error) {
      if (error instanceof RazorpayApiError) return json({ error: error.status === 401 ? 'Razorpay credentials were rejected.' : 'Payment service is unavailable. Please try again.' }, error.status === 401 ? 401 : 500)
      throw error
    }
  }

  if (body.action === 'verify') {
    const providerSubscriptionId = safe(body.razorpay_subscription_id)
    const paymentId = safe(body.razorpay_payment_id)
    const signature = safe(body.razorpay_signature, 300)
    if (!providerSubscriptionId || !paymentId || !signature) return json({ error: 'Missing payment verification details.' }, 400)
    const row = await db.prepare(`SELECT r.subscription_id,r.owner_id,r.amount_minor,r.currency,r.pricing_snapshot_json FROM razorpay_orders r WHERE r.razorpay_order_id=? AND r.owner_id=?`).bind(providerSubscriptionId, session.user.id).first<{ subscription_id: string; owner_id: string; amount_minor: number; currency: string; pricing_snapshot_json:string }>()
    if (!row || !verifySubscriptionSignature(providerSubscriptionId, paymentId, signature)) return json({ error: 'Payment verification failed.' }, 400)
    try {
      const payment = await retrieveRazorpayPayment(paymentId)
      if (payment.subscription_id !== providerSubscriptionId || payment.amount !== row.amount_minor || payment.currency !== row.currency) return json({ error: 'Payment does not match this subscription.' }, 409)
      await db.prepare(`UPDATE razorpay_orders SET razorpay_payment_id=?,status=?,updated_at=? WHERE razorpay_order_id=?`).bind(paymentId, payment.status === 'captured' ? 'captured' : 'verified', Date.now(), providerSubscriptionId).run()
      if (payment.status === 'captured') {
        await applyCustomerPaymentSucceeded(db, { id: row.subscription_id, payerUserId: row.owner_id, paymentId, paidAt: Number(payment.created_at) * 1000, now: Date.now() })
        const snapshot=JSON.parse(row.pricing_snapshot_json) as {referralCode?:string|null;referralDiscountMinor?:number}
        if(snapshot.referralCode) {
          const referrer=await db.prepare(`SELECT owner_id FROM customer_referral_codes WHERE code=? UNION ALL SELECT 'influencer:' || id owner_id FROM influencer_referral_codes WHERE code=? LIMIT 1`).bind(snapshot.referralCode,snapshot.referralCode).first<{owner_id:string}>()
          if(referrer) await db.prepare(`INSERT INTO referral_redemptions(id,referrer_owner_id,referred_owner_id,subscription_id,code,discount_minor,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(referred_owner_id) DO NOTHING`).bind(crypto.randomUUID(),referrer.owner_id,row.owner_id,row.subscription_id,snapshot.referralCode,Number(snapshot.referralDiscountMinor??0),Date.now()).run()
        }
      }
      return json({ ok: true, status: payment.status })
    } catch (error) {
      if (error instanceof RazorpayApiError) return json({ error: error.status === 401 ? 'Razorpay credentials were rejected.' : 'Payment verification is temporarily unavailable.' }, error.status === 401 ? 401 : 500)
      throw error
    }
  }
  return json({ error: 'Unsupported checkout action.' }, 400)
}
