-- Financial and operational history is never hard-deleted. Corrections are
-- represented by status changes, refunds and chained audit events.
CREATE TRIGGER IF NOT EXISTS customer_payments_no_delete
BEFORE DELETE ON customer_payments BEGIN
  SELECT RAISE(ABORT, 'payment history cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS razorpay_orders_no_delete
BEFORE DELETE ON razorpay_orders BEGIN
  SELECT RAISE(ABORT, 'payment order history cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS refunds_no_delete
BEFORE DELETE ON refunds BEGIN
  SELECT RAISE(ABORT, 'refund history cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS shipments_no_delete
BEFORE DELETE ON shipments BEGIN
  SELECT RAISE(ABORT, 'shipment history cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS edition_snapshots_no_delete
BEFORE DELETE ON edition_eligibility_snapshots BEGIN
  SELECT RAISE(ABORT, 'edition eligibility snapshots cannot be deleted');
END;

-- A scheduled row may be removed only during a documented pre-lock exclusion.
-- Once preparation starts, or the edition is locked, it is operational history.
CREATE TRIGGER IF NOT EXISTS fulfilments_history_no_delete
BEFORE DELETE ON customer_fulfilments
WHEN OLD.status <> 'scheduled'
  OR EXISTS (
    SELECT 1 FROM editions
    WHERE label = OLD.edition_label AND status <> 'eligibility_generated'
  )
BEGIN
  SELECT RAISE(ABORT, 'fulfilment history cannot be deleted');
END;
