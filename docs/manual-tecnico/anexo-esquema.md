# Diccionario SQL y restricciones

Esquema declarado, no inspección de una base desplegada. **NO VERIFICADO**: esquema efectivo, permisos y contenido de cualquier instancia. Las alteraciones posteriores prevalecen sobre las definiciones iniciales. No se reproduce el seed con datos personales.

## app_users

Fuente: [backend/database/migrations/001_issue_1_admin.sql](../../backend/database/migrations/001_issue_1_admin.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE app_users (

  id uuid PRIMARY KEY,
  full_name varchar(150) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  role varchar(32) NOT NULL CHECK (role IN ('ADMIN', 'ADMINISTRATIVE', 'CASHIER', 'INVENTORY', 'OPERATOR')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## clients

Fuente: [backend/database/migrations/001_issue_1_admin.sql](../../backend/database/migrations/001_issue_1_admin.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE clients (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(180) NOT NULL,
  identification_type varchar(40) NOT NULL,
  identification varchar(80) NOT NULL UNIQUE,
  phone varchar(40),
  email varchar(254),
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## work_orders

Fuente: [backend/database/migrations/001_issue_1_admin.sql](../../backend/database/migrations/001_issue_1_admin.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE work_orders (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(24) NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES clients(id),
  engine_brand varchar(100) NOT NULL,
  engine_model varchar(100) NOT NULL,
  engine_serial varchar(120),
  service_type varchar(120) NOT NULL,
  description text NOT NULL,
  intake_notes text,
  public_note text,
  status varchar(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  assigned_worker varchar(150),
  estimated_date date,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## audit_events

Fuente: [backend/database/migrations/001_issue_1_admin.sql](../../backend/database/migrations/001_issue_1_admin.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE audit_events (

  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES app_users(id),
  action varchar(80) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## inventory_items

Fuente: [backend/database/migrations/002_admin_operations.sql](../../backend/database/migrations/002_admin_operations.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE inventory_items (

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
```

## work_order_inventory

Fuente: [backend/database/migrations/002_admin_operations.sql](../../backend/database/migrations/002_admin_operations.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE work_order_inventory (

  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES app_users(id),
  PRIMARY KEY (work_order_id, inventory_item_id)
);
```

## payments

Fuente: [backend/database/migrations/002_admin_operations.sql](../../backend/database/migrations/002_admin_operations.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE payments (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method varchar(40) NOT NULL,
  reference varchar(120),
  notes text,
  received_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## app_settings

Fuente: [backend/database/migrations/002_admin_operations.sql](../../backend/database/migrations/002_admin_operations.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE app_settings (

  setting_key varchar(80) PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/002_admin_operations.sql`.

```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_worker_id uuid REFERENCES app_users(id);
```

## work_order_events

Fuente: [backend/database/migrations/003_operational_workflow.sql](../../backend/database/migrations/003_operational_workflow.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE work_order_events (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES app_users(id),
  subject_worker_id uuid REFERENCES app_users(id),
  event_type varchar(40) NOT NULL,
  message text NOT NULL,
  progress smallint CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## operator_notifications

Fuente: [backend/database/migrations/003_operational_workflow.sql](../../backend/database/migrations/003_operational_workflow.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE operator_notifications (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  type varchar(40) NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/003_operational_workflow.sql`.

```sql
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS priority varchar(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT')),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/005_public_order_tracking.sql`.

```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tracking_code varchar(32);
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/005_public_order_tracking.sql`.

```sql
ALTER TABLE work_orders
  ALTER COLUMN tracking_code SET DEFAULT ('MTR-' || upper(encode(gen_random_bytes(12), 'hex'))),
  ALTER COLUMN tracking_code SET NOT NULL;
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/005_public_order_tracking.sql`.

```sql
ALTER TABLE work_orders
      ADD CONSTRAINT work_orders_tracking_code_format CHECK (tracking_code ~ '^MTR-[A-F0-9]{24}$');
```

### Modificación posterior de clients

Fuente: `backend/database/migrations/006_administrative_workflow.sql`.

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/006_administrative_workflow.sql`.

```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
```

### Modificación posterior de app_users

Fuente: `backend/database/migrations/006_cloud_app_users_compatibility.sql`.

```sql
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS full_name varchar(150),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
```

### Modificación posterior de app_users

Fuente: `backend/database/migrations/006_cloud_app_users_compatibility.sql`.

```sql
ALTER TABLE public.app_users
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;
```

### Modificación posterior de work_orders

Fuente: `backend/database/migrations/007_order_finance.sql`.

```sql
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2)
  CHECK (total_amount IS NULL OR total_amount >= 0);
```

## inventory_movements

Fuente: [backend/database/migrations/008_inventory_end_to_end.sql](../../backend/database/migrations/008_inventory_end_to_end.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE inventory_movements (

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
```

### Modificación posterior de inventory_items

Fuente: `backend/database/migrations/008_inventory_end_to_end.sql`.

```sql
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
```

### Modificación posterior de app_users

Fuente: `backend/database/migrations/009_mandatory_password_change.sql`.

```sql
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
```

## auth_login_attempts

Fuente: [backend/database/migrations/010_auth_security_and_rate_limits.sql](../../backend/database/migrations/010_auth_security_and_rate_limits.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE auth_login_attempts (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier varchar(255) NOT NULL,
  attempt_type varchar(30) NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 1,
  locked_until timestamptz NULL,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## cash_sessions

Fuente: [backend/database/migrations/011_cash_sessions.sql](../../backend/database/migrations/011_cash_sessions.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE cash_sessions (

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
```

### Modificación posterior de payments

Fuente: `backend/database/migrations/011_cash_sessions.sql`.

```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES cash_sessions(id);
```

### Modificación posterior de cash_sessions

Fuente: `backend/database/migrations/011_cash_sessions.sql`.

```sql
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
```

## part_requests

Fuente: [backend/database/migrations/012_part_requests.sql](../../backend/database/migrations/012_part_requests.sql). Definición inicial, complementada por las alteraciones listadas abajo.

```sql
CREATE TABLE part_requests (

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
```

### Modificación posterior de part_requests

Fuente: `backend/database/migrations/012_part_requests.sql`.

```sql
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
```

## Índices declarados

```sql
-- 001_issue_1_admin.sql
CREATE INDEX IF NOT EXISTS idx_users_role_active ON app_users(role, is_active);
-- 001_issue_1_admin.sql
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(full_name, identification);
-- 001_issue_1_admin.sql
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON work_orders(status, created_at DESC);
-- 001_issue_1_admin.sql
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
-- 002_admin_operations.sql
CREATE INDEX IF NOT EXISTS idx_orders_assigned_worker ON work_orders(assigned_worker_id);
-- 002_admin_operations.sql
CREATE INDEX IF NOT EXISTS idx_order_inventory_order ON work_order_inventory(work_order_id);
-- 002_admin_operations.sql
CREATE INDEX IF NOT EXISTS idx_payments_order_created ON payments(work_order_id, created_at DESC);
-- 003_operational_workflow.sql
CREATE INDEX IF NOT EXISTS idx_operational_orders_worker ON work_orders(assigned_worker_id, status, estimated_date);
-- 003_operational_workflow.sql
CREATE INDEX IF NOT EXISTS idx_work_order_events_worker ON work_order_events(subject_worker_id, created_at DESC);
-- 003_operational_workflow.sql
CREATE INDEX IF NOT EXISTS idx_operator_notifications_user ON operator_notifications(user_id, read_at, created_at DESC);
-- 005_public_order_tracking.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_tracking_code ON work_orders(tracking_code);
-- 006_administrative_workflow.sql
CREATE INDEX IF NOT EXISTS idx_orders_estimated_active ON work_orders(estimated_date) WHERE status IN ('PENDING', 'IN_PROGRESS');
-- 007_order_finance.sql
CREATE INDEX IF NOT EXISTS idx_work_orders_total_amount ON public.work_orders(total_amount);
-- 008_inventory_end_to_end.sql
CREATE INDEX IF NOT EXISTS idx_inventory_items_type_category ON inventory_items(item_type, category);
-- 008_inventory_end_to_end.sql
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);
-- 008_inventory_end_to_end.sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created ON inventory_movements(inventory_item_id, created_at DESC);
-- 008_inventory_end_to_end.sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type_created ON inventory_movements(movement_type, created_at DESC);
-- 008_inventory_end_to_end.sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(work_order_id) WHERE work_order_id IS NOT NULL;
-- 008_inventory_end_to_end.sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_performed_by ON inventory_movements(performed_by);
-- 010_auth_security_and_rate_limits.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_login_attempts_unique
  ON public.auth_login_attempts (identifier, attempt_type);
-- 010_auth_security_and_rate_limits.sql
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON public.auth_login_attempts (locked_until);
-- 011_cash_sessions.sql
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open ON cash_sessions(cashier_id) WHERE closed_at IS NULL;
-- 011_cash_sessions.sql
CREATE INDEX IF NOT EXISTS cash_sessions_history ON cash_sessions(cashier_id, opened_at DESC);
-- 011_cash_sessions.sql
CREATE INDEX IF NOT EXISTS payments_cash_session ON payments(cash_session_id);
-- 012_part_requests.sql
CREATE INDEX IF NOT EXISTS part_requests_order ON part_requests(work_order_id,created_at DESC);
-- 012_part_requests.sql
CREATE INDEX IF NOT EXISTS part_requests_queue ON part_requests(status,created_at);
-- 012_part_requests.sql
CREATE INDEX IF NOT EXISTS part_requests_item ON part_requests(inventory_item_id);
-- 012_part_requests.sql
CREATE UNIQUE INDEX IF NOT EXISTS part_requests_pending_item ON part_requests(work_order_id,inventory_item_id) WHERE status='PENDING';
```
