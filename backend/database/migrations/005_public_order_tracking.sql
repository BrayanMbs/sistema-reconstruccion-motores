-- Codes have 96 bits of entropy. Existing orders receive one once and future
-- orders receive one at the database level, outside any client-controlled input.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tracking_code varchar(32);

UPDATE work_orders
SET tracking_code = 'MTR-' || upper(encode(gen_random_bytes(12), 'hex'))
WHERE tracking_code IS NULL;

ALTER TABLE work_orders
  ALTER COLUMN tracking_code SET DEFAULT ('MTR-' || upper(encode(gen_random_bytes(12), 'hex'))),
  ALTER COLUMN tracking_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_tracking_code ON work_orders(tracking_code);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_tracking_code_format') THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT work_orders_tracking_code_format CHECK (tracking_code ~ '^MTR-[A-F0-9]{24}$');
  END IF;
END $$;
