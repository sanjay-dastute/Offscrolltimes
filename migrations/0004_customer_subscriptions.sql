-- Customer-facing subscription records. These tables are intentionally
-- separate from the incorporation lifecycle tables.
CREATE TABLE customer_subscriptions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming', 'active', 'paused', 'cancelled', 'completed', 'refunded', 'payment_failed'
  )),
  currency TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  contact_email TEXT,
  delivery_address_json TEXT,
  starts_at INTEGER,
  ends_at INTEGER,
  next_dispatch_at INTEGER,
  copies_total INTEGER NOT NULL CHECK (copies_total > 0),
  copies_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (copies_fulfilled >= 0),
  renewal_enabled INTEGER NOT NULL DEFAULT 0,
  cancellation_requested_at INTEGER,
  paused_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_customer_subscriptions_owner
  ON customer_subscriptions (owner_id, created_at DESC);

CREATE TABLE customer_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  owner_id TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  invoice_url TEXT,
  paid_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_customer_payments_owner
  ON customer_payments (owner_id, created_at DESC);

CREATE TABLE customer_fulfilments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  owner_id TEXT NOT NULL,
  edition_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'prepared', 'dispatched', 'delivered', 'delayed', 'returned', 'replacement')),
  tracking_url TEXT,
  dispatched_at INTEGER,
  delivered_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (subscription_id, edition_label)
);

CREATE INDEX idx_customer_fulfilments_owner
  ON customer_fulfilments (owner_id, created_at DESC);
