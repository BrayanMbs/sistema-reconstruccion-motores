BEGIN;
CREATE TABLE IF NOT EXISTS cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id uuid NOT NULL REFERENCES app_users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_amount numeric(12,2) NOT NULL CHECK (opening_amount >= 0),
  counted_cash numeric(12,2) CHECK (counted_cash >= 0),
  expected_cash numeric(12,2),
  closing_notes text,
  CHECK ((closed_at IS NULL AND counted_cash IS NULL AND expected_cash IS NULL) OR
         (closed_at IS NOT NULL AND counted_cash IS NOT NULL AND expected_cash IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open ON cash_sessions(cashier_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS cash_sessions_history ON cash_sessions(cashier_id, opened_at DESC);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES cash_sessions(id);
CREATE INDEX IF NOT EXISTS payments_cash_session ON payments(cash_session_id);
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON cash_sessions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON cash_sessions FROM authenticated;
  END IF;
END $$;
COMMIT;
