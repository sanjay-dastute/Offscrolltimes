CREATE TABLE IF NOT EXISTS application_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  session_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS application_sessions_user_active_idx
  ON application_sessions(user_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS identity_security_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK(action IN ('identity_linked','identity_unlinked','sessions_revoked')),
  provider TEXT,
  provider_subject TEXT,
  summary_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS identity_security_events_user_idx
  ON identity_security_events(actor_user_id, created_at DESC);
