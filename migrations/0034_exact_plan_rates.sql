-- Explicit monthly rates avoid percentage rounding on prepaid plan totals.
UPDATE admin_subscription_options SET monthly_price_minor=CASE duration_months WHEN 1 THEN 19900 WHEN 3 THEN 18500 WHEN 12 THEN 17500 ELSE NULL END,
  discount_basis_points=0,amount_minor=CASE duration_months WHEN 1 THEN 19900 WHEN 3 THEN 55500 WHEN 12 THEN 210000 ELSE amount_minor END,
  updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE product_id='puzzle-post' AND duration_months IN (1,3,12);
-- Preserve the existing INR 159/month introductory annual offer.
UPDATE admin_discounts SET value=19200,minimum_order_minor=210000,updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id='launch-159' AND code='LAUNCH159';
