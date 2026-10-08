CREATE TABLE influencer_referral_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_basis_points INTEGER NOT NULL CHECK (discount_basis_points BETWEEN 0 AND 10000),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
