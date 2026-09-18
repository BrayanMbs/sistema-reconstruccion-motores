import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

const cloudUrl = process.env.DATABASE_URL;
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

if (!cloudUrl) throw new Error("DATABASE_URL es obligatoria.");

const localDatabaseConfig = async (): Promise<{ host: string; port: number; database: string; user: string; password: string }> => {
  const environmentFile = await readFile(join(process.cwd(), "..", ".env"), "utf8");
  const values = Object.fromEntries(environmentFile.split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }));
  return {
    host: "localhost",
    port: Number(values.POSTGRES_PORT) || 5432,
    database: values.POSTGRES_DB,
    user: values.POSTGRES_USER,
    password: values.POSTGRES_PASSWORD
  };
};

const columns = async (database: Client): Promise<unknown[]> => (await database.query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'app_users'
  ORDER BY ordinal_position
`)).rows;

const tables = ["clients", "inventory_items", "work_orders", "work_order_inventory", "payments", "app_settings", "audit_events", "work_order_events", "operator_notifications"];

const tableCounts = async (database: Client): Promise<Record<string, string>> => {
  const counts = await Promise.all(tables.map(async (table) => [table, (await database.query(`SELECT count(*) AS count FROM public.${table}`)).rows[0].count] as const));
  return Object.fromEntries(counts);
};

const run = async (): Promise<void> => {
  const cloud = new Client({ connectionString: cloudUrl, ssl: { rejectUnauthorized } });
  const local = new Client(await localDatabaseConfig());
  await Promise.all([cloud.connect(), local.connect()]);
  try {
    const [cloudColumns, localColumns, cloudCount, localCount, cloudTableCounts, localTableCounts, orphanedRelations] = await Promise.all([
      columns(cloud),
      columns(local),
      cloud.query("SELECT count(*) AS count FROM public.app_users"),
      local.query("SELECT count(*) AS count FROM public.app_users"),
      tableCounts(cloud),
      tableCounts(local),
      cloud.query(`SELECT
        (SELECT count(*) FROM public.work_orders o LEFT JOIN public.clients c ON c.id = o.client_id WHERE c.id IS NULL) AS orders_without_client,
        (SELECT count(*) FROM public.work_order_inventory i LEFT JOIN public.work_orders o ON o.id = i.work_order_id WHERE o.id IS NULL) AS inventory_without_order,
        (SELECT count(*) FROM public.payments p LEFT JOIN public.work_orders o ON o.id = p.work_order_id WHERE o.id IS NULL) AS payments_without_order,
        (SELECT count(*) FROM public.work_order_events e LEFT JOIN public.work_orders o ON o.id = e.work_order_id WHERE o.id IS NULL) AS events_without_order`)
    ]);
    console.log("Supabase app_users:", JSON.stringify(cloudColumns));
    console.log("Local app_users:", JSON.stringify(localColumns));
    console.log("Registros Supabase:", cloudCount.rows[0].count);
    console.log("Registros local:", localCount.rows[0].count);
    console.log("Conteos Supabase:", JSON.stringify(cloudTableCounts));
    console.log("Conteos local:", JSON.stringify(localTableCounts));
    console.log("Relaciones huerfanas en Supabase:", JSON.stringify(orphanedRelations.rows[0]));
  } finally {
    await Promise.all([cloud.end(), local.end()]);
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
