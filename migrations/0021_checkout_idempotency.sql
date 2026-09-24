ALTER TABLE razorpay_orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE razorpay_webhook_receipts ADD COLUMN processing_outcome TEXT;
ALTER TABLE razorpay_webhook_receipts ADD COLUMN error_summary TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS razorpay_orders_user_idempotency_idx
  ON razorpay_orders(owner_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
