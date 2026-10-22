-- 010_auth_security_and_rate_limits.sql
-- Tabla para registrar intentos de inicio de sesión y bloqueos temporales por cuenta o IP
-- Compatible con entornos multi-instancia y balanceadores de carga.

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier varchar(255) NOT NULL,
  attempt_type varchar(30) NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 1,
  locked_until timestamptz NULL,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_login_attempts_unique
  ON public.auth_login_attempts (identifier, attempt_type);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON public.auth_login_attempts (locked_until);

