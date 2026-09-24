CREATE TABLE object_storage_records (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('damage_evidence','receipt','edition_file','product_asset','dispatch_export')),
  owner_id TEXT,
  related_type TEXT NOT NULL,
  related_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','published')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX object_storage_owner_idx ON object_storage_records(owner_id,category,created_at DESC);
CREATE INDEX object_storage_related_idx ON object_storage_records(related_type,related_id,category,created_at DESC);
