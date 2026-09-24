CREATE TABLE razorpay_orders (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL UNIQUE REFERENCES customer_subscriptions(id),
  owner_id TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('created','attempted','verified','captured','failed','cancelled','timed_out')),
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  pricing_snapshot_json TEXT NOT NULL,
  terms_accepted_at INTEGER NOT NULL,
  failure_reason TEXT,
  confirmation_sent_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE razorpay_webhook_receipts (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE INDEX razorpay_orders_owner_idx ON razorpay_orders(owner_id,created_at DESC);
