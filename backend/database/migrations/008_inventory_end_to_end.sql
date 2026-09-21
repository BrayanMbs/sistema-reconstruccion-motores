-- Issue #10: inventory catalog, immutable movements and traceability.
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS item_type varchar(20) NOT NULL DEFAULT 'PART' CHECK (item_type IN ('PART', 'MATERIAL', 'TOOL', 'CONSUMABLE')),
  ADD COLUMN IF NOT EXISTS category varchar(100) NOT NULL DEFAULT 'Otros',
  ADD COLUMN IF NOT EXISTS brand varchar(120),
  ADD COLUMN IF NOT EXISTS part_number varchar(120),
  ADD COLUMN IF NOT EXISTS compatibility text,
  ADD COLUMN IF NOT EXISTS location varchar(180),
  ADD COLUMN IF NOT EXISTS reference_unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (reference_unit_cost >= 0),
  ADD COLUMN IF NOT EXISTS reference_supplier varchar(180),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES app_users(id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  movement_type varchar(15) NOT NULL CHECK (movement_type IN ('ENTRY', 'EXIT', 'ADJUSTMENT')),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  previous_stock numeric(12,2) NOT NULL CHECK (previous_stock >= 0),
  resulting_stock numeric(12,2) NOT NULL CHECK (resulting_stock >= 0),
  reason varchar(120) NOT NULL,
  reference_document varchar(180),
  supplier_reference varchar(180),
  work_order_id uuid REFERENCES work_orders(id),
  observation text,
  performed_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_type_category ON inventory_items(item_type, category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created ON inventory_movements(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type_created ON inventory_movements(movement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_performed_by ON inventory_movements(performed_by);
