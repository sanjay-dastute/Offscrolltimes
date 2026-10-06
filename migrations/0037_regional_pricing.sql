-- A country can use its own monthly newspaper price and currency.
-- NULL retains the standard product price for that country.
ALTER TABLE admin_shipping_zones
  ADD COLUMN regional_monthly_price_minor INTEGER CHECK (regional_monthly_price_minor IS NULL OR regional_monthly_price_minor >= 0);
