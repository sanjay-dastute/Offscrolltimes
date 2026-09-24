CREATE TABLE account_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  subscription_id TEXT REFERENCES customer_subscriptions(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  effective_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_account_events_customer ON account_events(owner_id,created_at DESC);
ALTER TABLE customer_fulfilments ADD COLUMN courier TEXT;
