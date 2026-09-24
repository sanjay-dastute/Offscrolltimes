ALTER TABLE users ADD COLUMN primary_email TEXT;
ALTER TABLE auth_identities ADD COLUMN verified_claims_json TEXT NOT NULL DEFAULT '{}';
UPDATE users SET primary_email=(SELECT email FROM customers WHERE customers.user_id=users.id)
WHERE primary_email IS NULL;

CREATE TABLE oauth_transactions (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('google','microsoft')),
  state_hash TEXT NOT NULL UNIQUE,
  nonce_hash TEXT NOT NULL,
  pkce_challenge TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('login','link')),
  link_user_id TEXT REFERENCES users(id),
  return_to TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_oauth_transactions_expiry ON oauth_transactions(expires_at,consumed_at);

CREATE TABLE mfa_factors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL DEFAULT 'totp' CHECK(factor_type='totp'),
  encrypted_secret TEXT NOT NULL,
  recovery_code_hashes_json TEXT NOT NULL DEFAULT '[]',
  verified_at INTEGER,
  disabled_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id,factor_type)
);

CREATE VIEW sessions AS SELECT id,user_id,token_hash,expires_at,revoked_at,created_at,last_seen_at FROM application_sessions;
CREATE VIEW edition_eligibility AS SELECT * FROM edition_eligibility_snapshots;

CREATE TRIGGER oauth_transactions_no_delete BEFORE DELETE ON oauth_transactions
BEGIN SELECT RAISE(ABORT,'OAuth transaction history cannot be deleted'); END;

CREATE TRIGGER mfa_factors_admin_only_insert BEFORE INSERT ON mfa_factors
WHEN NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.user_id AND role='admin')
BEGIN SELECT RAISE(ABORT,'MFA factors are restricted to administrators'); END;
