DROP TRIGGER inventory_entries_no_delete;
CREATE TRIGGER inventory_protect_subscription_delete BEFORE DELETE ON edition_inventory_entries
WHEN OLD.kind NOT IN ('bulk_sale','marketing')
BEGIN SELECT RAISE(ABORT,'Subscription inventory records cannot be deleted'); END;
CREATE TRIGGER inventory_restore_deleted_stock AFTER DELETE ON edition_inventory_entries
BEGIN UPDATE editions SET copies_available=copies_available+OLD.quantity,updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id=OLD.edition_id; END;
