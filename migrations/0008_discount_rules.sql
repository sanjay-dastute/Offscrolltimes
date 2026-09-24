ALTER TABLE admin_discounts ADD COLUMN eligible_durations_json TEXT;
ALTER TABLE admin_discounts ADD COLUMN eligible_countries_json TEXT;
ALTER TABLE admin_discounts ADD COLUMN per_customer_limit INTEGER CHECK (per_customer_limit IS NULL OR per_customer_limit > 0);
ALTER TABLE admin_discounts ADD COLUMN minimum_duration_months INTEGER CHECK (minimum_duration_months IS NULL OR minimum_duration_months > 0);
ALTER TABLE admin_discounts ADD COLUMN minimum_order_minor INTEGER CHECK (minimum_order_minor IS NULL OR minimum_order_minor >= 0);
ALTER TABLE admin_discounts ADD COLUMN combinable_with_duration_discount INTEGER NOT NULL DEFAULT 0 CHECK (combinable_with_duration_discount IN (0,1));

CREATE INDEX IF NOT EXISTS discount_redemptions_customer_idx
  ON discount_redemptions(discount_id, owner_id, created_at DESC);
