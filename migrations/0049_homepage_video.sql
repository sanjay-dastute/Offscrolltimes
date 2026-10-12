CREATE TABLE homepage_video (
  id TEXT PRIMARY KEY CHECK(id='homepage'),
  asset_id TEXT NOT NULL UNIQUE REFERENCES object_storage_records(id),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
