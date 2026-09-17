import { Pool } from "pg";
import { env } from "./env";

/** Shared PostgreSQL pool. Repositories will use this when persistence is implemented. */
export const databasePool = new Pool(env.database);
