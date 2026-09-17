import "dotenv/config";

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  port: asNumber(process.env.PORT, 8080),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  database: {
    host: process.env.DB_HOST ?? "postgres",
    port: asNumber(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME ?? "motores_db",
    user: process.env.DB_USER ?? "motores_user",
    password: process.env.DB_PASSWORD ?? "motores_password"
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};
