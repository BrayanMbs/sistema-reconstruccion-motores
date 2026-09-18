import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const roles = new Set(["ADMIN", "ADMINISTRATIVE", "CASHIER", "INVENTORY", "OPERATOR"]);
const readArgument = (name: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`Falta --${name}.`);
  return value;
};

const email = readArgument("email").trim().toLowerCase();
const fullName = readArgument("name").trim();
const role = readArgument("role").trim().toUpperCase();
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
  throw new Error("DATABASE_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
}
if (!roles.has(role)) throw new Error("El rol no es válido.");

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
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const authUser = data.users.find((user) => user.email?.toLowerCase() === email);
  if (!authUser) throw new Error("No existe un usuario de Supabase Auth con ese correo.");

  const database = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized } });
  await database.connect();
  try {
    await database.query("BEGIN");
    const profileByEmail = await database.query<{ id: string }>("SELECT id FROM public.app_users WHERE email = $1", [email]);
    const existingId = profileByEmail.rows[0]?.id;
    if (existingId && existingId !== authUser.id) {
      await remapProfileReferences(database, existingId, authUser.id);
      await database.query("DELETE FROM public.app_users WHERE id = $1", [existingId]);
    }
    await database.query(`INSERT INTO public.app_users (id, full_name, email, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = now()`, [authUser.id, fullName, email, role]);
    await database.query("COMMIT");
    console.log(`Perfil vinculado: ${email} (${role})`);
  } catch (error) {
    await database.query("ROLLBACK");
    throw error;
  } finally {
    await database.end();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
