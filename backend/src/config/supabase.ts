import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Supabase credentials are intentionally optional while authentication is not implemented.
 * Auth middleware will use this client once project credentials are configured.
 */
export const createSupabaseClient = (): SupabaseClient | null => {
  if (!env.supabase.url || !env.supabase.anonKey) {
    return null;
  }

  return createClient(env.supabase.url, env.supabase.anonKey);
};

/** Only use this server-side client for administrative account provisioning. */
export const createSupabaseAdminClient = (): SupabaseClient | null => {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    return null;
  }

  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};
