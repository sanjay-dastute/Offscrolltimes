-- SQLite cannot alter the CHECK constraint on the existing storage metadata
-- table. Rebuild it so answer-sheet PDFs are a first-class, auditable category.
ALTER TABLE object_storage_records RENAME TO object_storage_records_legacy;
DROP INDEX object_storage_owner_idx;
DROP INDEX object_storage_related_idx;

CREATE TABLE object_storage_records (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('damage_evidence','receipt','edition_file','product_asset','dispatch_export','answer_sheet')),
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

INSERT INTO object_storage_records(id,object_key,category,owner_id,related_type,related_id,original_name,content_type,size_bytes,visibility,created_by,created_at,deleted_at)
  SELECT id,object_key,category,owner_id,related_type,related_id,original_name,content_type,size_bytes,visibility,created_by,created_at,deleted_at
  FROM object_storage_records_legacy;
DROP TABLE object_storage_records_legacy;
CREATE INDEX object_storage_owner_idx ON object_storage_records(owner_id,category,created_at DESC);
CREATE INDEX object_storage_related_idx ON object_storage_records(related_type,related_id,category,created_at DESC);

CREATE TABLE answer_sheets (
  id TEXT PRIMARY KEY,
  issue_number TEXT NOT NULL UNIQUE,
  issue_date TEXT NOT NULL,
  asset_id TEXT NOT NULL UNIQUE REFERENCES object_storage_records(id),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_answer_sheets_issue_date ON answer_sheets(issue_date DESC, issue_number);
