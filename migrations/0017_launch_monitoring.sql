CREATE TABLE operational_health_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('scheduled','manual','deployment')),
  status TEXT NOT NULL CHECK(status IN ('healthy','degraded')),
  failed_payments INTEGER NOT NULL DEFAULT 0,
  failed_messages INTEGER NOT NULL DEFAULT 0,
  unprocessed_webhooks INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_health_runs_created ON operational_health_runs(created_at DESC);

CREATE TABLE operational_alerts (
  id TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('warning','critical')),
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX idx_operational_alerts_open ON operational_alerts(status,created_at DESC);

