ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_worker_id uuid REFERENCES app_users(id);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(80) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  description text,
  unit varchar(40) NOT NULL DEFAULT 'unidad',
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_inventory (
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES app_users(id),
  PRIMARY KEY (work_order_id, inventory_item_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method varchar(40) NOT NULL,
  reference varchar(120),
  notes text,
  received_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key varchar(80) PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (setting_key, value) VALUES
  ('company', '{"name":"Motor Repair","phone":"","address":""}'::jsonb),
  ('finance', '{"currency":"GTQ","taxRate":0}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_worker ON work_orders(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_order_inventory_order ON work_order_inventory(work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_created ON payments(work_order_id, created_at DESC);
