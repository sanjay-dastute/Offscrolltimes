ALTER TABLE admin_products ADD COLUMN base_monthly_minor INTEGER NOT NULL DEFAULT 999 CHECK (base_monthly_minor >= 0);
ALTER TABLE admin_subscription_options ADD COLUMN discount_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (discount_basis_points BETWEEN 0 AND 10000);
ALTER TABLE admin_shipping_zones ADD COLUMN additional_copy_minor INTEGER NOT NULL DEFAULT 0 CHECK (additional_copy_minor >= 0);

UPDATE admin_subscription_options SET discount_basis_points = 1000 WHERE duration_months = 3;
UPDATE admin_subscription_options SET discount_basis_points = 2500 WHERE duration_months = 12;
INSERT INTO admin_subscription_options
  (id, product_id, name, duration_months, amount_minor, currency, active, created_at, updated_at, discount_basis_points)
VALUES ('six-month', 'puzzle-post', 'Six months', 6, 5095, 'USD', 1, 0, 0, 1500)
ON CONFLICT(id) DO NOTHING;

INSERT INTO admin_shipping_zones
  (country_code, country_name, currency, shipping_minor, tax_rate_basis_points, active, created_at, updated_at, additional_copy_minor)
VALUES
  ('IN','India','USD',0,0,1,0,0,0),
  ('GB','United Kingdom','USD',0,0,1,0,0,0),
  ('IE','Ireland','USD',0,0,1,0,0,0),
  ('DE','Germany','USD',0,0,1,0,0,0),
  ('FR','France','USD',0,0,1,0,0,0),
  ('ES','Spain','USD',0,0,1,0,0,0),
  ('IT','Italy','USD',0,0,1,0,0,0),
  ('NL','Netherlands','USD',0,0,1,0,0,0)
ON CONFLICT(country_code) DO NOTHING;

ALTER TABLE customer_subscriptions ADD COLUMN paid_through_at INTEGER;
ALTER TABLE customer_subscriptions ADD COLUMN pricing_snapshot_json TEXT;
ALTER TABLE customer_subscriptions ADD COLUMN entitlement_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (entitlement_status IN ('pending','paid','exhausted','refunded'));

ALTER TABLE customer_payments ADD COLUMN pricing_snapshot_json TEXT;

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id TEXT PRIMARY KEY,
  discount_id TEXT NOT NULL REFERENCES admin_discounts(id),
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(discount_id, subscription_id)
);
