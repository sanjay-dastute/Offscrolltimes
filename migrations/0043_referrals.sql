CREATE TABLE referral_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  discount_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (discount_basis_points BETWEEN 0 AND 10000),
  updated_at INTEGER NOT NULL
);
INSERT INTO referral_settings (id, discount_basis_points, updated_at) VALUES (1, 0, 0);

CREATE TABLE customer_referral_codes (
  owner_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE referral_redemptions (
  id TEXT PRIMARY KEY,
  referrer_owner_id TEXT NOT NULL,
  referred_owner_id TEXT NOT NULL UNIQUE,
  subscription_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  discount_minor INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
