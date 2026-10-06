-- Exact public term prices for international regions. The delivery charge stays
-- visible as its own line, while the total is the checkout-authoritative value.
CREATE TABLE IF NOT EXISTS regional_subscription_prices (
  country_code TEXT NOT NULL REFERENCES admin_shipping_zones(country_code),
  duration_months INTEGER NOT NULL CHECK(duration_months IN (1,3,12)),
  term_total_minor INTEGER NOT NULL CHECK(term_total_minor >= 100),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(country_code,duration_months)
);

INSERT INTO admin_shipping_zones(country_code,country_name,currency,shipping_minor,tax_rate_basis_points,active,additional_copy_minor,regional_monthly_price_minor,created_at,updated_at)
VALUES
  ('EU','European Union (EU)','EUR',300,0,1,0,499,0,0),
  ('US','USA','USD',400,0,1,0,599,0,0),
  ('AE','UAE','AED',1400,0,1,0,1099,0,0),
  ('GB','UK','GBP',300,0,1,0,499,0,0)
ON CONFLICT(country_code) DO UPDATE SET
  country_name=excluded.country_name,currency=excluded.currency,shipping_minor=excluded.shipping_minor,
  tax_rate_basis_points=excluded.tax_rate_basis_points,active=excluded.active,
  additional_copy_minor=excluded.additional_copy_minor,regional_monthly_price_minor=excluded.regional_monthly_price_minor,
  updated_at=excluded.updated_at;

INSERT INTO regional_subscription_prices(country_code,duration_months,term_total_minor,created_at,updated_at)
VALUES
  ('EU',1,799,0,0),('EU',3,1999,0,0),('EU',12,6999,0,0),
  ('US',1,999,0,0),('US',3,2499,0,0),('US',12,8999,0,0),
  ('AE',1,2500,0,0),('AE',3,6999,0,0),('AE',12,25000,0,0),
  ('GB',1,799,0,0),('GB',3,1999,0,0),('GB',12,6999,0,0)
ON CONFLICT(country_code,duration_months) DO UPDATE SET term_total_minor=excluded.term_total_minor,updated_at=excluded.updated_at;
