-- A durable claim prevents concurrent requests from issuing duplicate refunds.
CREATE TABLE refund_attempts (
  payment_id TEXT PRIMARY KEY REFERENCES customer_payments(id),
  subscription_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
