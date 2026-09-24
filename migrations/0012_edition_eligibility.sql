CREATE TABLE edition_eligibility_snapshots (
  id TEXT PRIMARY KEY,
  edition_id TEXT NOT NULL REFERENCES editions(id),
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  decision TEXT NOT NULL CHECK (decision IN ('included','excluded','override_included','override_excluded')),
  reason TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (edition_id, subscription_id)
);

CREATE INDEX idx_edition_eligibility_edition ON edition_eligibility_snapshots (edition_id, decision);
