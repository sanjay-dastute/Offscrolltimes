CREATE TABLE security_rate_limits (
  bucket TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(bucket,subject_hash,window_started_at)
);

CREATE INDEX idx_security_rate_limits_expiry ON security_rate_limits(window_started_at);

CREATE TABLE security_audit_chain (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id TEXT NOT NULL UNIQUE REFERENCES admin_audit_log(id),
  previous_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TRIGGER security_audit_chain_no_update BEFORE UPDATE ON security_audit_chain
BEGIN SELECT RAISE(ABORT,'security audit chain is append-only'); END;

CREATE TRIGGER security_audit_chain_no_delete BEFORE DELETE ON security_audit_chain
BEGIN SELECT RAISE(ABORT,'security audit chain is append-only'); END;

CREATE TRIGGER admin_audit_log_no_update BEFORE UPDATE ON admin_audit_log
BEGIN SELECT RAISE(ABORT,'admin audit log is append-only'); END;

CREATE TRIGGER admin_audit_log_no_delete BEFORE DELETE ON admin_audit_log
BEGIN SELECT RAISE(ABORT,'admin audit log is append-only'); END;
