-- 007_order_finance.sql
-- Add approved total amount to work_orders for financial tracking

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2)
  CHECK (total_amount IS NULL OR total_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_work_orders_total_amount ON public.work_orders(total_amount);
