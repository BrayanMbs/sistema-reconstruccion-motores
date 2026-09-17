ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS priority varchar(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT')),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS work_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES app_users(id),
  subject_worker_id uuid REFERENCES app_users(id),
  event_type varchar(40) NOT NULL,
  message text NOT NULL,
  progress smallint CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  type varchar(40) NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_orders_worker ON work_orders(assigned_worker_id, status, estimated_date);
CREATE INDEX IF NOT EXISTS idx_work_order_events_worker ON work_order_events(subject_worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_user ON operator_notifications(user_id, read_at, created_at DESC);
