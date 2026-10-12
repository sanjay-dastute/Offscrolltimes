ALTER TABLE homepage_poll ADD COLUMN option_three TEXT;
ALTER TABLE homepage_poll ADD COLUMN option_four TEXT;
ALTER TABLE homepage_poll ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER TABLE homepage_poll ADD COLUMN revision TEXT NOT NULL DEFAULT '';
UPDATE homepage_poll SET revision=id||'_'||updated_at;
ALTER TABLE homepage_poll_votes RENAME TO homepage_poll_votes_legacy;
CREATE TABLE homepage_poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES homepage_poll(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  choice INTEGER NOT NULL CHECK(choice BETWEEN 1 AND 4),
  created_at INTEGER NOT NULL,
  UNIQUE(poll_id,voter_key)
);
INSERT INTO homepage_poll_votes SELECT * FROM homepage_poll_votes_legacy;
DROP TABLE homepage_poll_votes_legacy;
CREATE INDEX homepage_poll_votes_poll_id_idx ON homepage_poll_votes(poll_id);

ALTER TABLE editions ADD COLUMN printed_copies INTEGER NOT NULL DEFAULT 0 CHECK(printed_copies>=0);
UPDATE editions SET printed_copies=MAX(copies_available,COALESCE((SELECT CAST(json_extract(summary_json,'$.copiesAvailable') AS INTEGER) FROM admin_audit_log WHERE target_id=editions.id AND action IN ('edition.created','edition.updated') ORDER BY created_at DESC LIMIT 1),copies_available));
CREATE TABLE edition_inventory_entries (
  id TEXT PRIMARY KEY,
  edition_id TEXT NOT NULL REFERENCES editions(id),
  kind TEXT NOT NULL CHECK(kind IN ('subscription','bulk_sale','marketing')),
  subscription_id TEXT,
  quantity INTEGER NOT NULL CHECK(quantity>0),
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(edition_id,subscription_id)
);
-- Import the existing sold/reserved count without deducting stock a second time.
INSERT INTO edition_inventory_entries(id,edition_id,kind,quantity,note,created_by,created_at)
SELECT 'import_'||id,id,'subscription',printed_copies-copies_available,'Existing paid reservations imported','migration',updated_at FROM editions WHERE printed_copies>copies_available;
CREATE TRIGGER inventory_insufficient_stock BEFORE INSERT ON edition_inventory_entries
WHEN NEW.quantity>(SELECT copies_available FROM editions WHERE id=NEW.edition_id)
BEGIN SELECT RAISE(ABORT,'Not enough copies remaining for this entry'); END;
CREATE TRIGGER inventory_deduct_stock AFTER INSERT ON edition_inventory_entries
BEGIN UPDATE editions SET copies_available=copies_available-NEW.quantity,updated_at=NEW.created_at WHERE id=NEW.edition_id; END;
CREATE TRIGGER inventory_entries_no_update BEFORE UPDATE ON edition_inventory_entries
BEGIN SELECT RAISE(ABORT,'Inventory history cannot be rewritten'); END;
CREATE TRIGGER inventory_entries_no_delete BEFORE DELETE ON edition_inventory_entries
BEGIN SELECT RAISE(ABORT,'Inventory history cannot be deleted'); END;
