import { applyCustomerPaymentSucceeded, recordCustomerSubscriptionRenewal } from '#/lib/customer/store.server'
import { listRazorpaySubscriptionInvoices, RazorpayApiError } from '#/lib/razorpay.server'

type PendingSubscription = {
  subscription_id: string
  owner_id: string
  razorpay_subscription_id: string
  amount_minor: number
  currency: string
  status: string
}

type RazorpayInvoice = {
  payment_id?: unknown
  status?: unknown
  amount?: unknown
  currency?: unknown
  paid_at?: unknown
  created_at?: unknown
}

export type RazorpayReconciliation = {
  checked: number
  activated: number
  renewed: number
  skipped: number
  failures: number
}

const invoicePaidAt = (invoice: RazorpayInvoice) => {
  const seconds = Number(invoice.paid_at ?? invoice.created_at)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Date.now()
}

/**
 * Reconcile only provider invoices that are explicitly marked paid and exactly
 * match the local amount and currency. This is intentionally a recovery path,
 * not a substitute for signed webhooks.
 */
export async function reconcileRazorpayPayments(db: D1Database, limit = 100): Promise<RazorpayReconciliation> {
  const rows = await db.prepare(`SELECT r.subscription_id,r.owner_id,rs.razorpay_subscription_id,
      r.amount_minor,r.currency,s.status
    FROM razorpay_orders r
    JOIN razorpay_recurring_subscriptions rs ON rs.subscription_id=r.subscription_id
    JOIN customer_subscriptions s ON s.id=r.subscription_id
    WHERE s.status IN ('upcoming','payment_failed','active')
    ORDER BY r.created_at DESC
    LIMIT ?`).bind(Math.max(1, Math.min(limit, 100))).all<PendingSubscription>()

  const summary: RazorpayReconciliation = { checked: 0, activated: 0, renewed: 0, skipped: 0, failures: 0 }
  for (const row of rows.results) {
    summary.checked += 1
    try {
      const invoices = await listRazorpaySubscriptionInvoices(row.razorpay_subscription_id)
      const paid = invoices
        .filter((invoice): invoice is RazorpayInvoice => invoice && typeof invoice === 'object')
        .filter(invoice => invoice.status === 'paid'
          && typeof invoice.payment_id === 'string'
          && Number(invoice.amount) === Number(row.amount_minor)
          && String(invoice.currency).toUpperCase() === String(row.currency).toUpperCase())
        .sort((a, b) => invoicePaidAt(a) - invoicePaidAt(b))

      if (!paid.length) { summary.skipped += 1; continue }

      for (const invoice of paid) {
        const paymentId = String(invoice.payment_id)
        const alreadyRecorded = await db.prepare(`SELECT id FROM customer_payments WHERE provider_payment_id=? LIMIT 1`).bind(paymentId).first()
        if (alreadyRecorded) continue
        const paidAt = invoicePaidAt(invoice)
        if (row.status === 'upcoming' || row.status === 'payment_failed') {
          const activated = await applyCustomerPaymentSucceeded(db, { id: row.subscription_id, payerUserId: row.owner_id, paymentId, paidAt, now: Date.now() })
          if (activated) {
            await db.prepare(`UPDATE razorpay_orders SET razorpay_payment_id=?,status='captured',updated_at=? WHERE subscription_id=?`).bind(paymentId, Date.now(), row.subscription_id).run()
            summary.activated += 1
            row.status = 'active'
          }
        } else {
          const renewed = await recordCustomerSubscriptionRenewal(db, {
            id: row.subscription_id,
            paymentId,
            paidAt,
            amountMinor: Number(invoice.amount),
            currency: String(invoice.currency).toUpperCase(),
            now: Date.now(),
          })
          if (renewed) summary.renewed += 1
        }
      }
    } catch (error) {
      summary.failures += 1
      if (error instanceof RazorpayApiError) console.error('razorpay_reconciliation_provider_error', { subscriptionId: row.razorpay_subscription_id, status: error.status })
      else console.error('razorpay_reconciliation_failed', { subscriptionId: row.razorpay_subscription_id, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return summary
}
