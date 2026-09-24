-- Apply at production launch. The introductory offer expires after 30 days.
UPDATE admin_products SET base_monthly_minor=19900, updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id='puzzle-post';

UPDATE admin_subscription_options SET currency='INR',
  active=CASE WHEN duration_months IN (1,3,12) THEN 1 ELSE 0 END,
  discount_basis_points=CASE duration_months WHEN 3 THEN 704 WHEN 12 THEN 1206 ELSE 0 END,
  amount_minor=CASE duration_months WHEN 1 THEN 19900 WHEN 3 THEN 55500 WHEN 12 THEN 210000 ELSE amount_minor END,
  updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE product_id='puzzle-post';

UPDATE admin_shipping_zones SET active=0, updated_at=CAST(strftime('%s','now') AS INTEGER)*1000;
UPDATE admin_shipping_zones SET currency='INR', shipping_minor=0, additional_copy_minor=0,
  tax_rate_basis_points=0, active=1, updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE country_code='IN';

INSERT INTO admin_discounts
  (id,code,kind,value,starts_at,ends_at,usage_limit,active,created_at,updated_at,
   eligible_durations_json,eligible_countries_json,per_customer_limit,
   minimum_duration_months,minimum_order_minor,combinable_with_duration_discount)
VALUES ('launch-159','LAUNCH159','fixed',48000,
  CAST(strftime('%s','now') AS INTEGER)*1000,
  (CAST(strftime('%s','now') AS INTEGER)+2592000)*1000,
  NULL,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,
  '[12]','["IN"]',1,12,238800,0)
ON CONFLICT(code) DO UPDATE SET kind=excluded.kind,value=excluded.value,
  starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active,
  eligible_durations_json=excluded.eligible_durations_json,
  eligible_countries_json=excluded.eligible_countries_json,
  per_customer_limit=excluded.per_customer_limit,
  minimum_duration_months=excluded.minimum_duration_months,
  minimum_order_minor=excluded.minimum_order_minor,
  combinable_with_duration_discount=excluded.combinable_with_duration_discount,
  updated_at=excluded.updated_at;
