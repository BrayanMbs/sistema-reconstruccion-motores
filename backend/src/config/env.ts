import "dotenv/config";
import type { PoolConfig } from "pg";

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const databaseUrl = process.env.DATABASE_URL;
const databaseSsl = process.env.DB_SSL === "true";
const databaseRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

if (process.env.CLOUD_DATABASE_REQUIRED === "true" && !databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria cuando se ejecuta con la base compartida.");
}

const buildCloudDatabaseConfig = (
  url: string,
  ssl: boolean,
  rejectUnauthorized: boolean,
  max: number
): PoolConfig => {
  try {
    const parsed = new URL(url);
    const hasSsl = ssl || parsed.searchParams.has("sslmode") || parsed.searchParams.has("ssl");
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return {
      connectionString: parsed.toString(),
      ssl: hasSsl ? { rejectUnauthorized } : undefined,
      max
    };
  } catch {
    return {
      connectionString: url,
      ssl: ssl ? { rejectUnauthorized } : undefined,
      max
    };
  }
};

const database: PoolConfig = databaseUrl
  ? buildCloudDatabaseConfig(
      databaseUrl,
      databaseSsl,
      databaseRejectUnauthorized,
      asNumber(process.env.DB_POOL_MAX, 10)
    )
  : {
      host: process.env.DB_HOST ?? "postgres",
      port: asNumber(process.env.DB_PORT, 5432),
      database: process.env.DB_NAME ?? "motores_db",
      user: process.env.DB_USER ?? "motores_user",
      password: process.env.DB_PASSWORD ?? "motores_password",
      max: asNumber(process.env.DB_POOL_MAX, 10)
    };

export const env = {
  port: asNumber(process.env.PORT, 8080),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  database,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};
