CREATE TABLE transactional_email_log (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  subscription_id TEXT REFERENCES customer_subscriptions(id),
  message_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  provider_email_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('attempted','sent','failed','skipped','delivered','bounced','complained')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  provider_event TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_transactional_email_subscription ON transactional_email_log(subscription_id,created_at DESC);
CREATE INDEX idx_transactional_email_status ON transactional_email_log(status,updated_at);
