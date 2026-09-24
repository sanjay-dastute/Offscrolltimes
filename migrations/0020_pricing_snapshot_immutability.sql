-- Commercial order facts are append-only accounting records. Corrections are
-- represented by refunds/audit events, never by rewriting the original sale.
CREATE TRIGGER IF NOT EXISTS orders_immutable_update
BEFORE UPDATE ON orders BEGIN
  SELECT RAISE(ABORT, 'commercial orders are immutable');
END;

CREATE TRIGGER IF NOT EXISTS orders_immutable_delete
BEFORE DELETE ON orders BEGIN
  SELECT RAISE(ABORT, 'commercial orders are immutable');
END;

CREATE TRIGGER IF NOT EXISTS subscriptions_pricing_snapshot_immutable
BEFORE UPDATE OF pricing_snapshot_json ON customer_subscriptions
WHEN OLD.pricing_snapshot_json IS NOT NEW.pricing_snapshot_json BEGIN
  SELECT RAISE(ABORT, 'subscription pricing snapshot is immutable');
END;

CREATE TRIGGER IF NOT EXISTS payments_pricing_snapshot_immutable
BEFORE UPDATE OF pricing_snapshot_json ON customer_payments
WHEN OLD.pricing_snapshot_json IS NOT NEW.pricing_snapshot_json BEGIN
  SELECT RAISE(ABORT, 'payment pricing snapshot is immutable');
END;

CREATE TRIGGER IF NOT EXISTS razorpay_pricing_snapshot_immutable
BEFORE UPDATE OF pricing_snapshot_json ON razorpay_orders
WHEN OLD.pricing_snapshot_json IS NOT NEW.pricing_snapshot_json BEGIN
  SELECT RAISE(ABORT, 'Razorpay pricing snapshot is immutable');
END;
