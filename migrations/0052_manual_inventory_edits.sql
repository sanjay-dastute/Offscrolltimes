DROP TRIGGER inventory_entries_no_update;
ALTER TABLE edition_inventory_entries ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
UPDATE edition_inventory_entries SET updated_at=created_at;
CREATE TRIGGER inventory_protect_entry_identity BEFORE UPDATE ON edition_inventory_entries
WHEN OLD.kind NOT IN ('bulk_sale','marketing') OR NEW.id IS NOT OLD.id OR NEW.kind IS NOT OLD.kind OR NEW.subscription_id IS NOT OLD.subscription_id OR NEW.created_by IS NOT OLD.created_by OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT,'Only bulk and marketing quantities, edition and notes can be edited'); END;
CREATE TRIGGER inventory_edit_stock_check BEFORE UPDATE ON edition_inventory_entries
WHEN NEW.quantity > (SELECT copies_available FROM editions WHERE id=NEW.edition_id) + CASE WHEN NEW.edition_id=OLD.edition_id THEN OLD.quantity ELSE 0 END
BEGIN SELECT RAISE(ABORT,'Not enough copies remaining for this entry'); END;
CREATE TRIGGER inventory_adjust_edited_stock AFTER UPDATE OF quantity,edition_id ON edition_inventory_entries
BEGIN
  UPDATE editions SET copies_available=copies_available+OLD.quantity,updated_at=NEW.updated_at WHERE id=OLD.edition_id;
  UPDATE editions SET copies_available=copies_available-NEW.quantity,updated_at=NEW.updated_at WHERE id=NEW.edition_id;
END;
