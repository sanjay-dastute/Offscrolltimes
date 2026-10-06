-- Razorpay subscription mandate records. One local customer subscription has
-- one corresponding Razorpay subscription; payment rows remain the source of
-- truth for every collected billing cycle.
CREATE TABLE IF NOT EXISTS razorpay_recurring_subscriptions (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL UNIQUE REFERENCES customer_subscriptions(id),
  owner_id TEXT NOT NULL,
  razorpay_subscription_id TEXT NOT NULL UNIQUE,
  razorpay_plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly','quarterly','yearly')),
  cycle_amount_minor INTEGER NOT NULL CHECK (cycle_amount_minor >= 100),
  currency TEXT NOT NULL,
  total_count INTEGER NOT NULL CHECK (total_count > 0),
  paid_count INTEGER NOT NULL DEFAULT 0,
  next_charge_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_razorpay_recurring_owner
  ON razorpay_recurring_subscriptions(owner_id, created_at DESC);
