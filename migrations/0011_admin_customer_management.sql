ALTER TABLE customer_subscriptions ADD COLUMN contact_phone TEXT;

CREATE INDEX idx_customer_subscriptions_status_term
  ON customer_subscriptions (status, duration_months, ends_at);
