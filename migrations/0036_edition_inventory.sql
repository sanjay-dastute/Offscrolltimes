ALTER TABLE editions ADD COLUMN copies_available INTEGER NOT NULL DEFAULT 0 CHECK(copies_available >= 0);
ALTER TABLE editions ADD COLUMN copy_price_minor INTEGER NOT NULL DEFAULT 0 CHECK(copy_price_minor >= 0);
