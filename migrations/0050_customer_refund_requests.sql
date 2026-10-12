CREATE TABLE customer_refund_requests (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  payment_id TEXT NOT NULL UNIQUE REFERENCES customer_payments(id),
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted')),
  amount_minor INTEGER,
  provider_refund_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
