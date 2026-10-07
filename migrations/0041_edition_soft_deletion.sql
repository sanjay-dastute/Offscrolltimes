-- Locked editions have an immutable eligibility record. Removing them from the
-- working queue therefore uses a soft delete rather than destroying history.
ALTER TABLE editions ADD COLUMN deleted_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_editions_active_dispatch
  ON editions (deleted_at, dispatch_at DESC);
