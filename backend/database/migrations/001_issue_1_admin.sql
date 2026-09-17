CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  full_name varchar(150) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  role varchar(32) NOT NULL CHECK (role IN ('ADMIN', 'ADMINISTRATIVE', 'CASHIER', 'INVENTORY', 'OPERATOR')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(180) NOT NULL,
  identification_type varchar(40) NOT NULL,
  identification varchar(80) NOT NULL UNIQUE,
  phone varchar(40),
  email varchar(254),
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS work_order_code_seq START 1;

CREATE TABLE IF NOT EXISTS work_orders (
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

CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES app_users(id),
  action varchar(80) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role_active ON app_users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(full_name, identification);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON work_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
