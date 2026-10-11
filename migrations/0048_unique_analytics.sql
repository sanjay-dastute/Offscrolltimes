CREATE TABLE analytics_visitors (
  device_key TEXT PRIMARY KEY,
  account_key TEXT,
  country_code TEXT,
  region_name TEXT,
  region_code TEXT,
  created_at INTEGER NOT NULL
);
ALTER TABLE first_party_analytics_events ADD COLUMN visitor_key TEXT;
CREATE UNIQUE INDEX analytics_unique_visitor_event ON first_party_analytics_events(visitor_key,event_name) WHERE visitor_key IS NOT NULL;
CREATE INDEX analytics_visitors_account ON analytics_visitors(account_key);
