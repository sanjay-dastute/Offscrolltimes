ALTER TABLE customers ADD COLUMN display_name TEXT;
ALTER TABLE customers ADD COLUMN whatsapp_number TEXT;
UPDATE customers SET display_name=(SELECT name FROM addresses WHERE customer_id=customers.id ORDER BY version DESC LIMIT 1);
UPDATE customers SET display_name=(SELECT json_extract(verified_claims_json,'$.name') FROM auth_identities WHERE user_id=customers.user_id ORDER BY updated_at DESC LIMIT 1) WHERE display_name IS NULL;
CREATE INDEX idx_subscriptions_owner_created ON customer_subscriptions(owner_id,created_at);
