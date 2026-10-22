BEGIN;
CREATE TABLE IF NOT EXISTS part_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 work_order_id uuid NOT NULL REFERENCES work_orders(id),
 inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
 requested_by uuid NOT NULL REFERENCES app_users(id),
 quantity numeric(12,2) NOT NULL CHECK(quantity>0),
 reason text NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 approved_unit_price numeric(12,2) CHECK(approved_unit_price>=0),
 charge_amount numeric(12,2) CHECK(charge_amount>=0),
 reviewed_by uuid REFERENCES app_users(id),
 review_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 CHECK ((status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL AND approved_unit_price IS NULL AND charge_amount IS NULL)
 OR (status='REJECTED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND approved_unit_price IS NULL AND charge_amount IS NULL)
 OR (status='APPROVED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND approved_unit_price IS NOT NULL AND charge_amount IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS part_requests_order ON part_requests(work_order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS part_requests_queue ON part_requests(status,created_at);
CREATE INDEX IF NOT EXISTS part_requests_item ON part_requests(inventory_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS part_requests_pending_item ON part_requests(work_order_id,inventory_item_id) WHERE status='PENDING';
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON part_requests FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON part_requests FROM authenticated; END IF;
END $$;
COMMIT;
