-- Stripe was retired in favour of Razorpay. Historical applied migrations stay
-- in this repository; this forward-only migration removes Stripe-only storage.
DROP TABLE IF EXISTS stripe_cancellation_refunds;
DROP TABLE IF EXISTS stripe_webhook_receipts;
DROP TABLE IF EXISTS stripe_checkouts;
DROP INDEX IF EXISTS idx_stripe_subscription;
DROP INDEX IF EXISTS idx_stripe_invoice_payment;

-- Keep generic payment and renewal fields, but remove retired provider IDs.
ALTER TABLE customer_subscriptions DROP COLUMN stripe_subscription_id;
ALTER TABLE customer_subscriptions DROP COLUMN stripe_customer_id;
