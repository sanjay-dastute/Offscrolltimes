CREATE TABLE customer_privacy_requests (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK(request_type IN ('access','deletion')),
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','completed','rejected')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX customer_privacy_requests_owner_idx ON customer_privacy_requests(owner_id,created_at DESC);
