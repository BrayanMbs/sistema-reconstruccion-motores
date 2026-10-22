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

const configuredOrigins: string[] = [];

if (process.env.CORS_ORIGINS) {
  configuredOrigins.push(...process.env.CORS_ORIGINS.split(","));
}

if (process.env.FRONTEND_URL) {
  configuredOrigins.push(process.env.FRONTEND_URL);
}

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, "");

const corsOrigins = Array.from(
  new Set(
    (configuredOrigins.length > 0
      ? configuredOrigins
      : isProduction
        ? []
        : ["http://localhost:3000"])
      .map(normalizeOrigin)
      .filter(Boolean)
  )
);

const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === "true";
const vercelPreviewProject = process.env.VERCEL_PREVIEW_PROJECT_NAME?.trim();

const parseTrustProxy = (value: string | undefined, defaultVal: boolean | number): boolean | number | string => {
  if (value === undefined || value === "") return defaultVal;
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (Number.isInteger(num) && num >= 0) return num;
  return value;
};

const trustProxy = parseTrustProxy(process.env.TRUST_PROXY, isProduction ? 1 : false);

export const env = {
  isProduction,
  port: asNumber(process.env.PORT, 8080),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  corsOrigins,
  allowVercelPreviews,
  vercelPreviewProject,
  trustProxy,
  bodyLimit: process.env.BODY_LIMIT ?? "1mb",
  requestTimeoutMs: asNumber(process.env.REQUEST_TIMEOUT_MS, 30000),
  auth: {
    maxFailedAttempts: asNumber(process.env.AUTH_MAX_FAILED_ATTEMPTS, 5),
    lockoutWindowMinutes: asNumber(process.env.AUTH_LOCKOUT_WINDOW_MINUTES, 15),
    lockoutDurationMinutes: asNumber(process.env.AUTH_LOCKOUT_DURATION_MINUTES, 15),
    ipRateLimitMax: asNumber(process.env.AUTH_IP_RATE_LIMIT_MAX, 15),
    ipRateLimitWindowMs: asNumber(process.env.AUTH_IP_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000)
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    apiMax: asNumber(process.env.API_RATE_LIMIT_MAX, 600),
    apiWindowMs: asNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    publicTrackingMax: asNumber(process.env.PUBLIC_TRACKING_RATE_LIMIT_MAX, 60),
    publicTrackingWindowMs: asNumber(process.env.PUBLIC_TRACKING_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000)
  },
  database,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

