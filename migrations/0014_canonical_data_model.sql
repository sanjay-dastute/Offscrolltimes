-- Canonical internal identity and privacy records. Google and Microsoft are authentication providers only.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  account_state TEXT NOT NULL DEFAULT 'active' CHECK(account_state IN ('active','restricted','deletion_requested','deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  email TEXT,
  phone TEXT,
  transactional_contact_basis TEXT NOT NULL DEFAULT 'contract',
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK(marketing_consent IN (0,1)),
  marketing_consent_at INTEGER,
  privacy_request_state TEXT NOT NULL DEFAULT 'none',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  address_type TEXT NOT NULL CHECK(address_type IN ('delivery','billing')),
  version INTEGER NOT NULL CHECK(version > 0),
  name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  region TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  active_from INTEGER NOT NULL,
  active_to INTEGER,
  change_reason TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(customer_id,address_type,version)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  subscription_id TEXT NOT NULL UNIQUE REFERENCES customer_subscriptions(id),
  provider_order_id TEXT UNIQUE,
  currency TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
  pricing_snapshot_json TEXT NOT NULL,
  delivery_address_snapshot_json TEXT NOT NULL,
  terms_accepted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  fulfilment_id TEXT NOT NULL REFERENCES customer_fulfilments(id),
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  courier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  status TEXT NOT NULL CHECK(status IN ('prepared','dispatched','delivered','delayed','returned','replacement')),
  event_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES customer_payments(id),
  subscription_id TEXT NOT NULL REFERENCES customer_subscriptions(id),
  provider_refund_id TEXT,
  amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
  currency TEXT NOT NULL,
  reason TEXT NOT NULL,
  provider_status TEXT NOT NULL CHECK(provider_status IN ('requested','processing','processed','failed','recorded_manually')),
  entitlement_effect TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE data_retention_policies (
  data_category TEXT PRIMARY KEY,
  retention_period_months INTEGER,
  deletion_rule TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  anonymise_after_expiry INTEGER NOT NULL DEFAULT 0 CHECK(anonymise_after_expiry IN (0,1)),
  updated_at INTEGER NOT NULL
);

INSERT INTO data_retention_policies VALUES
 ('identity_and_account',24,'Delete or anonymise 24 months after account closure unless linked to legally retained transactions.','Contract and legitimate interests',1,0),
 ('contact_and_addresses',24,'Remove inactive address versions 24 months after the final fulfilment; preserve address snapshots on legally retained orders.','Contract',1,0),
 ('orders_payments_refunds',96,'Retain immutable tax and accounting records for 8 years, then anonymise where permitted.','Legal obligation',1,0),
 ('subscriptions_fulfilments_shipments',96,'Retain operational history with financial records for 8 years.','Contract and legal obligation',1,0),
 ('enquiries',24,'Delete or anonymise resolved enquiries after 24 months unless a dispute requires longer retention.','Legitimate interests',1,0),
 ('transactional_messages',24,'Delete message delivery logs after 24 months; retain only aggregate delivery statistics.','Legitimate interests',1,0),
 ('audit_security_events',96,'Retain safe change summaries for 8 years; never store secrets or raw payment credentials.','Legal obligation and security',0,0),
 ('privacy_requests',72,'Retain request and resolution evidence for 6 years after completion.','Legal obligation',0,0);

CREATE INDEX idx_addresses_customer_active ON addresses(customer_id,address_type,active_to);
CREATE INDEX idx_shipments_fulfilment ON shipments(fulfilment_id,event_at DESC);
CREATE INDEX idx_refunds_subscription ON refunds(subscription_id,created_at DESC);

-- Bring existing paid/subscription customers into the canonical identity layer.
INSERT INTO users(id,owner_id,role,account_state,created_at,updated_at)
SELECT 'user_'||owner_id,owner_id,'customer','active',MIN(created_at),MAX(updated_at)
FROM customer_subscriptions GROUP BY owner_id;

INSERT INTO customers(id,user_id,email,phone,transactional_contact_basis,marketing_consent,privacy_request_state,created_at,updated_at)
SELECT 'customer_'||s.owner_id,'user_'||s.owner_id,MAX(s.contact_email),MAX(s.contact_phone),'contract',0,'none',MIN(s.created_at),MAX(s.updated_at)
FROM customer_subscriptions s GROUP BY s.owner_id;

INSERT INTO addresses(id,customer_id,address_type,version,name,line1,line2,city,region,postal_code,country,active_from,change_reason,created_at)
SELECT 'address_'||s.id,'customer_'||s.owner_id,'delivery',1,
 json_extract(s.delivery_address_json,'$.name'),json_extract(s.delivery_address_json,'$.line1'),json_extract(s.delivery_address_json,'$.line2'),
 json_extract(s.delivery_address_json,'$.city'),json_extract(s.delivery_address_json,'$.region'),json_extract(s.delivery_address_json,'$.postalCode'),
 json_extract(s.delivery_address_json,'$.country'),s.created_at,'Migrated current delivery address',s.created_at
FROM customer_subscriptions s WHERE s.delivery_address_json IS NOT NULL
AND s.id=(SELECT s2.id FROM customer_subscriptions s2 WHERE s2.owner_id=s.owner_id AND s2.delivery_address_json IS NOT NULL ORDER BY s2.created_at DESC,s2.id DESC LIMIT 1);

INSERT INTO orders(id,customer_id,subscription_id,provider_order_id,currency,amount_minor,pricing_snapshot_json,delivery_address_snapshot_json,terms_accepted_at,created_at)
SELECT 'order_'||r.id,'customer_'||r.owner_id,r.subscription_id,r.razorpay_order_id,r.currency,r.amount_minor,r.pricing_snapshot_json,
 COALESCE(s.delivery_address_json,'{}'),r.terms_accepted_at,r.created_at FROM razorpay_orders r JOIN customer_subscriptions s ON s.id=r.subscription_id;

-- Stable canonical read names for the established operational tables.
CREATE VIEW products AS SELECT * FROM admin_products;
CREATE VIEW subscription_options AS SELECT * FROM admin_subscription_options;
CREATE VIEW payments AS SELECT * FROM customer_payments;
CREATE VIEW subscriptions AS SELECT * FROM customer_subscriptions;
CREATE VIEW fulfilments AS SELECT * FROM customer_fulfilments;
CREATE VIEW promotions AS SELECT * FROM admin_discounts;
CREATE VIEW promotion_redemptions AS SELECT * FROM discount_redemptions;
CREATE VIEW enquiries AS SELECT * FROM contact_enquiries;
CREATE VIEW audit_events AS SELECT * FROM admin_audit_log;
