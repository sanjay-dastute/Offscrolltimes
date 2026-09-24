CREATE TABLE admin_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE admin_subscription_options (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES admin_products(id),
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE admin_discounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('percentage', 'fixed', 'free_shipping')),
  value INTEGER NOT NULL CHECK (value >= 0),
  starts_at INTEGER,
  ends_at INTEGER,
  usage_limit INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE admin_shipping_zones (
  country_code TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  shipping_minor INTEGER NOT NULL DEFAULT 0,
  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE editions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  issue_number INTEGER NOT NULL UNIQUE,
  eligibility_cutoff_at INTEGER NOT NULL,
  dispatch_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'eligibility_generated', 'locked', 'dispatched', 'completed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE admin_content (
  content_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_admin_audit_created ON admin_audit_log (created_at DESC);
CREATE INDEX idx_editions_dispatch ON editions (dispatch_at DESC);

INSERT INTO admin_products (id, name, description, active, created_at, updated_at)
VALUES ('puzzle-post', 'Offscroll Times', 'Monthly printed puzzle newspaper', 1, 0, 0);

INSERT INTO admin_subscription_options
  (id, product_id, name, duration_months, amount_minor, currency, active, created_at, updated_at)
VALUES
  ('monthly', 'puzzle-post', 'Monthly', 1, 999, 'USD', 1, 0, 0),
  ('quarterly', 'puzzle-post', 'Quarterly', 3, 2699, 'USD', 1, 0, 0),
  ('annual', 'puzzle-post', 'Annual', 12, 8999, 'USD', 1, 0, 0);
