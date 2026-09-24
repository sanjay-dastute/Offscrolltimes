CREATE TABLE first_party_analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL CHECK(event_name IN ('page_view','duration_selected','checkout_started','payment_succeeded','payment_failed')),
  path TEXT,
  dimension_value TEXT,
  country_code TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_analytics_event_time ON first_party_analytics_events(event_name,created_at DESC);

