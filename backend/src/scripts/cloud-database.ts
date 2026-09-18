import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client, type QueryResultRow } from "pg";

const migrationsDirectory = join(process.cwd(), "database", "migrations");
const skippedMigrations = new Set(["004_seed_admin.sql"]);
const tables = [
  "app_users",
  "clients",
  "inventory_items",
  "work_orders",
  "work_order_inventory",
  "payments",
  "app_settings",
  "audit_events",
  "work_order_events",
  "operator_notifications"
];

const cloudUrl = process.env.DATABASE_URL;
const localUrl = process.env.SOURCE_DATABASE_URL;
const importLocalData = process.argv.includes("--import-local-data");
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

if (!cloudUrl) throw new Error("DATABASE_URL es obligatoria y debe apuntar a PostgreSQL de Supabase.");

const quote = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`;

const localDatabaseConfig = async (): Promise<{ host: string; port: number; database: string; user: string; password: string }> => {
  const environmentFile = await readFile(join(process.cwd(), "..", ".env"), "utf8");
  const values = Object.fromEntries(environmentFile.split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }));
  if (!values.POSTGRES_DB || !values.POSTGRES_USER || values.POSTGRES_PASSWORD === undefined) {
    throw new Error("No se encontraron las variables POSTGRES_* de la base local en el .env de la raíz.");
  }
  return {
    host: "localhost",
    port: Number(values.POSTGRES_PORT) || 5432,
    database: values.POSTGRES_DB,
    user: values.POSTGRES_USER,
    password: values.POSTGRES_PASSWORD
  };
};

const copyRows = async (source: Client, target: Client, table: string): Promise<number> => {
  const rows = await source.query<QueryResultRow>(`SELECT * FROM public.${quote(table)}`);
  if (rows.rowCount === 0) return 0;

  const columns = rows.fields.map((field) => field.name);
  const names = columns.map(quote).join(", ");
  const values = columns.map((_, index) => `$${index + 1}`).join(", ");
  const conflict = table === "app_settings"
    ? "ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at"
    : "ON CONFLICT DO NOTHING";
  const identityOverride = table === "audit_events" ? " OVERRIDING SYSTEM VALUE" : "";
  const statement = `INSERT INTO public.${quote(table)} (${names})${identityOverride} VALUES (${values}) ${conflict}`;

  for (const row of rows.rows) await target.query(statement, columns.map((column) => row[column]));
  return rows.rows.length;
};

const applyMigrations = async (target: Client): Promise<void> => {
  await target.query(`CREATE TABLE IF NOT EXISTS public.app_schema_migrations (
    name varchar(120) PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const migrations = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql") && !skippedMigrations.has(name))
    .sort();

  for (const migration of migrations) {
    const applied = await target.query("SELECT 1 FROM public.app_schema_migrations WHERE name = $1", [migration]);
    if (applied.rowCount) continue;

    const sql = await readFile(join(migrationsDirectory, migration), "utf8");
    await target.query("BEGIN");
    try {
      await target.query(sql);
      await target.query("INSERT INTO public.app_schema_migrations (name) VALUES ($1)", [migration]);
      await target.query("COMMIT");
      console.log(`Aplicada: ${migration}`);
    } catch (error) {
      await target.query("ROLLBACK");
      throw error;
    }
  }
};

const run = async (): Promise<void> => {
  const target = new Client({ connectionString: cloudUrl, ssl: { rejectUnauthorized } });
  const source = importLocalData
    ? localUrl ? new Client({ connectionString: localUrl }) : new Client(await localDatabaseConfig())
    : null;
  if (source) await source.connect();
  try {
    await target.connect();
    try {
      await applyMigrations(target);
      if (!source) return;
      for (const table of tables) {
        const count = await copyRows(source, target, table);
        console.log(`${table}: ${count} registro(s) revisado(s)`);
      }
      await target.query(`SELECT setval(
        pg_get_serial_sequence('public.audit_events', 'id'),
        COALESCE((SELECT MAX(id) FROM public.audit_events), 1),
        (SELECT COUNT(*) > 0 FROM public.audit_events)
      )`);
    } finally {
      await target.end();
    }
  } finally {
    if (source) await source.end();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
