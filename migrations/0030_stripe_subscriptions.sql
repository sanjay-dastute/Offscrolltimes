ALTER TABLE customer_subscriptions ADD COLUMN payment_provider TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE customer_subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE customer_subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE customer_subscriptions ADD COLUMN renewal_at INTEGER;
ALTER TABLE customer_subscriptions ADD COLUMN renewal_amount_minor INTEGER;
CREATE UNIQUE INDEX idx_stripe_subscription ON customer_subscriptions(stripe_subscription_id);
CREATE TABLE stripe_checkouts (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, request_hash TEXT NOT NULL,
 checkout_session_id TEXT UNIQUE, checkout_url TEXT, stripe_subscription_id TEXT,
 first_amount_minor INTEGER NOT NULL, renewal_amount_minor INTEGER NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER, UNIQUE(owner_id,id)
);
CREATE TABLE stripe_webhook_receipts (
 event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, received_at INTEGER NOT NULL,
 processed_at INTEGER
);
CREATE UNIQUE INDEX idx_stripe_invoice_payment ON customer_payments(provider_payment_id) WHERE provider_payment_id LIKE 'in_%';
