# Stripe automatic subscriptions

Stripe Checkout is hosted at `/checkout/stripe`. All new checkouts use
`mode=subscription` and recurring monthly prices with interval counts 1, 3 or 12.
There is no one-time-payment fallback. The full selected term is charged initially
and then automatically for the same duration and quantity. First-term promotional
discounts use a Stripe coupon with `duration=once`; the normal renewal amount is
shown before authorisation. The authorised regular price stays fixed unless an
explicit, separately communicated price change is implemented.

## Configuration required before accepting payments

1. Apply D1 migration `0030_stripe_subscriptions.sql` to `LIFECYCLE_DB`.
2. Configure `STRIPE_SECRET_KEY` as a Cloudflare Worker secret. Use a test key first.
3. In the corresponding Stripe account/mode, register
   `https://offscrolltimes.com/api/webhooks/stripe` for:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Configure its signing secret as `STRIPE_WEBHOOK_SECRET` on the Worker.
5. Set the Stripe account's public business details and terms-of-service URL to
   `https://offscrolltimes.com/policies/subscription`. Checkout collects explicit
   terms consent. Enable appropriate invoice/renewal notification and payment
   retry settings in Stripe.
6. Verify initial payment, automatic renewal, failed renewal, authentication-required
   renewal, duplicate webhook delivery, and cancellation in Stripe test mode. Use
   Stripe test clocks for renewals. Then repeat configuration with approved live
   credentials and a live webhook endpoint. Never paste secrets into chat or commit
   them; `.dev.vars` is ignored for local development.

Hosted Checkout requires only the server secret key; a publishable key is not needed.
API calls are pinned to `2025-03-31.basil`. Webhook event data supplies resource IDs;
the server retrieves authoritative invoice/subscription records using this version.
The server validates paid amounts, billing interval, currency, owner, and collection
method before granting entitlement. A browser redirect never marks an order paid.

## Cancellation and existing records

Customer or admin cancellation calls Stripe with `cancel_at_period_end=true`.
If Stripe cannot confirm cancellation, the UI reports failure rather than claiming
charges were stopped. Existing paid editions are retained. Pausing Stripe billing
is not available in the account. Existing legacy one-time purchases are not silently
converted to mandates or automatically charged.

The customer profile shows the next renewal date, amount, and whether renewal is
enabled. Each invoice has a separate payment record and receipt URL. CSV/JSON exports
include the new subscription provider and renewal fields. Payment methods are stored
by Stripe, never by this application. Refunds for Stripe invoices currently require
processing and reconciliation by staff; automated Stripe refund synchronisation is
outside this implementation.

## Razorpay preservation

The original checkout is preserved in `src/legacy/RazorpayCheckout.tsx.disabled`.
`/checkout/razorpay` redirects to Stripe, and new Razorpay API checkouts are disabled
unless `ENABLE_RAZORPAY_CHECKOUT=true`. Existing Razorpay webhook and invoice code
remains available for historical records. Reactivation requires a review of recurring
billing support; the preserved implementation is one-time checkout.

## India authentication

Automatic billing does not bypass issuer authentication. Stripe manages e-mandates
and pre-debit notices; some recurring charges require customer authentication,
including charges above applicable mandate limits. See
https://docs.stripe.com/india-recurring-payments.
