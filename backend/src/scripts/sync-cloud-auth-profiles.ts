import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

type Profile = { id: string; full_name: string; email: string; role: string; is_active: boolean };

const databaseUrl = process.env.DATABASE_URL;
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

const rootEnvironment = async (): Promise<Record<string, string>> => Object.fromEntries((await readFile(join(process.cwd(), "..", ".env"), "utf8"))
  .split(/\r?\n/)
  .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
  .map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));

const remapProfileReferences = async (database: Client, oldId: string, newId: string): Promise<void> => {
  await database.query("UPDATE public.work_orders SET created_by = $1 WHERE created_by = $2", [newId, oldId]);
  await database.query("UPDATE public.work_orders SET assigned_worker_id = $1 WHERE assigned_worker_id = $2", [newId, oldId]);
  await database.query("UPDATE public.work_order_inventory SET assigned_by = $1 WHERE assigned_by = $2", [newId, oldId]);
  await database.query("UPDATE public.payments SET received_by = $1 WHERE received_by = $2", [newId, oldId]);
  await database.query("UPDATE public.app_settings SET updated_by = $1 WHERE updated_by = $2", [newId, oldId]);
  await database.query("UPDATE public.audit_events SET actor_id = $1 WHERE actor_id = $2", [newId, oldId]);
  await database.query("UPDATE public.work_order_events SET actor_id = $1 WHERE actor_id = $2", [newId, oldId]);
  await database.query("UPDATE public.work_order_events SET subject_worker_id = $1 WHERE subject_worker_id = $2", [newId, oldId]);
  await database.query("UPDATE public.operator_notifications SET user_id = $1 WHERE user_id = $2", [newId, oldId]);
};

const run = async (): Promise<void> => {
  const root = await rootEnvironment();
  const supabaseUrl = process.env.SUPABASE_URL || root.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || root.SUPABASE_SERVICE_ROLE_KEY;
  if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
    throw new Error("DATABASE_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const database = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized } });
  await database.connect();
  try {
    const profiles = (await database.query<Profile>("SELECT id, full_name, email, role, is_active FROM public.app_users")).rows;
    const profilesByEmail = new Map(profiles.map((profile) => [profile.email.toLowerCase(), profile]));
    let remapped = 0;
    let alreadyLinked = 0;
    let missingProfile = 0;

    for (const authUser of data.users) {
      if (!authUser.email) continue;
      const profile = profilesByEmail.get(authUser.email.toLowerCase());
      if (!profile) {
        missingProfile += 1;
        continue;
      }
      if (profile.id === authUser.id) {
        alreadyLinked += 1;
        continue;
      }

      await database.query("BEGIN");
      try {
        await remapProfileReferences(database, profile.id, authUser.id);
        await database.query("DELETE FROM public.app_users WHERE id = $1", [profile.id]);
        await database.query(`INSERT INTO public.app_users (id, full_name, email, role, is_active)
          VALUES ($1, $2, $3, $4, $5)`, [authUser.id, profile.full_name, profile.email, profile.role, profile.is_active]);
        await database.query("COMMIT");
        remapped += 1;
      } catch (syncError) {
        await database.query("ROLLBACK");
        throw syncError;
      }
    }
    console.log(`Perfiles ya vinculados: ${alreadyLinked}`);
    console.log(`Perfiles vinculados conservando relaciones: ${remapped}`);
    console.log(`Usuarios Auth sin perfil/rol: ${missingProfile}`);
  } finally {
    await database.end();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
