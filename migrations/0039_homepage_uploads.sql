CREATE TABLE homepage_uploads (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE REFERENCES object_storage_records(id),
  position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(position)
);
