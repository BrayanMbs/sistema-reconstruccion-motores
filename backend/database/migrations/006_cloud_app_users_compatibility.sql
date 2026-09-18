-- A Supabase project may already have a minimal app_users table created before
-- the application schema is deployed. Complete it without discarding profiles.
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS full_name varchar(150),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.app_users
SET
  full_name = COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1)),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE full_name IS NULL
   OR full_name = ''
   OR created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.app_users
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;
