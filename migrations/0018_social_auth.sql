CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('google','microsoft')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS auth_identities_user_idx ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS auth_identities_email_idx ON auth_identities(provider_email);

-- Authentication ownership uses the existing users.owner_id column during
-- the compatibility migration. New values are provider-qualified identities
-- such as google:<subject> and microsoft:<subject>; the column can be renamed
-- after every commercial table has migrated to users.id.
