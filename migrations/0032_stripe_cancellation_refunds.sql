CREATE TABLE stripe_cancellation_refunds (
 payment_id TEXT PRIMARY KEY REFERENCES customer_payments(id),
 subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
 owner_id TEXT NOT NULL,
 requested_at INTEGER NOT NULL,
 stripe_refund_id TEXT,
 status TEXT NOT NULL DEFAULT 'requested',
 updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX stripe_cancellation_refund_provider ON stripe_cancellation_refunds(stripe_refund_id);
