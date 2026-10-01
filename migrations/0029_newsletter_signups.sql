CREATE TABLE newsletter_subscribers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 status TEXT NOT NULL DEFAULT 'subscribed' CHECK(status IN ('subscribed','unsubscribed')),
 consent_at INTEGER NOT NULL, consent_text TEXT NOT NULL,
 unsubscribe_token_hash TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX newsletter_subscribers_created ON newsletter_subscribers(created_at,id);
