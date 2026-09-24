INSERT INTO data_retention_policies(data_category,retention_period_months,deletion_rule,legal_basis,anonymise_after_expiry,updated_at) VALUES
 ('oauth_transactions',1,'Automatically delete expired OAuth transactions after 24 hours.','Security and legitimate interests',0,0),
 ('application_sessions',1,'Automatically delete sessions 30 days after expiry or revocation.','Security and contract',0,0),
 ('fulfilment_exports',0,'Export grants expire after 2 minutes; downloaded CSV files must be deleted after secure ingestion.','Contract and data minimisation',0,0)
ON CONFLICT(data_category) DO UPDATE SET retention_period_months=excluded.retention_period_months,deletion_rule=excluded.deletion_rule,legal_basis=excluded.legal_basis,anonymise_after_expiry=excluded.anonymise_after_expiry,updated_at=excluded.updated_at;

DROP TRIGGER oauth_transactions_no_delete;
CREATE TRIGGER oauth_transactions_active_no_delete BEFORE DELETE ON oauth_transactions
WHEN OLD.expires_at >= unixepoch('now') * 1000
BEGIN SELECT RAISE(ABORT,'Active OAuth transactions cannot be deleted'); END;
