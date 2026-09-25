import "dotenv/config";
import type { PoolConfig } from "pg";

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const databaseUrl = process.env.DATABASE_URL;
const databaseSsl = process.env.DB_SSL === "true";
const databaseRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

const isProduction = process.env.NODE_ENV === "production" || process.env.CLOUD_DATABASE_REQUIRED === "true";

if (isProduction && !databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria en producción o cuando se ejecuta con la base compartida.");
}

const buildCloudDatabaseConfig = (
  url: string,
  ssl: boolean,
  rejectUnauthorized: boolean,
  max: number
): PoolConfig => {
  const connectionTimeoutMillis = asNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 10000);
  const idleTimeoutMillis = asNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000);

  try {
    const parsed = new URL(url);
    const hasSsl = ssl || parsed.searchParams.has("sslmode") || parsed.searchParams.has("ssl");
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return {
      connectionString: parsed.toString(),
      ssl: hasSsl ? { rejectUnauthorized } : undefined,
      max,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      allowExitOnIdle: true
    };
  } catch {
    return {
      connectionString: url,
      ssl: ssl ? { rejectUnauthorized } : undefined,
      max,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      allowExitOnIdle: true
    };
  }
};

const defaultPoolMax = isProduction ? 1 : 10;
const poolMax = asNumber(process.env.DB_POOL_MAX, defaultPoolMax);

const database: PoolConfig = databaseUrl
  ? buildCloudDatabaseConfig(
      databaseUrl,
      databaseSsl,
      databaseRejectUnauthorized,
      poolMax
    )
  : {
      host: process.env.DB_HOST ?? "postgres",
      port: asNumber(process.env.DB_PORT, 5432),
      database: process.env.DB_NAME ?? "motores_db",
      user: process.env.DB_USER ?? "motores_user",
      password: process.env.DB_PASSWORD ?? "motores_password",
      max: poolMax,
      connectionTimeoutMillis: asNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5000),
      idleTimeoutMillis: asNumber(process.env.DB_IDLE_TIMEOUT_MS, 10000)
    };

const rawCorsOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL;
const corsOrigins = (rawCorsOrigins
  ? rawCorsOrigins.split(",")
  : isProduction
    ? []
    : ["http://localhost:3000"])
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.FRONTEND_URL && !corsOrigins.includes(process.env.FRONTEND_URL.trim())) {
  corsOrigins.push(process.env.FRONTEND_URL.trim());
}

const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === "true";
const vercelPreviewProject = process.env.VERCEL_PREVIEW_PROJECT_NAME?.trim();

export const env = {
  isProduction,
  port: asNumber(process.env.PORT, 8080),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  corsOrigins,
  allowVercelPreviews,
  vercelPreviewProject,
  database,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

