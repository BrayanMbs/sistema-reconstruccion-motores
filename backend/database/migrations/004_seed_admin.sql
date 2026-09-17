INSERT INTO public.app_users (id, full_name, email, role, is_active)
VALUES (
  'fff64c1d-34c9-4895-a906-3a59d15992a1',
  'Sebastian',
  'tsebastianm@miumg.edu.gt',
  'ADMIN',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();
