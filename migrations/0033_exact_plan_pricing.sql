-- Add plan-specific monthly pricing; keep current rates until the application is deployed.
ALTER TABLE admin_subscription_options ADD COLUMN monthly_price_minor INTEGER CHECK(monthly_price_minor IS NULL OR monthly_price_minor > 0);
