import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { AppUser, Role } from "../models/domain";

const mapUser = (row: QueryResultRow): AppUser => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class UserRepository {
  async findById(id: string): Promise<AppUser | null> {
    const result = await databasePool.query("SELECT * FROM app_users WHERE id = $1", [id]);
    return result.rowCount ? mapUser(result.rows[0]) : null;
  }

  async list(search: string | undefined, role: string | undefined, active: string | undefined, page: number, limit: number) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      clauses.push(`role = $${params.length}`);
    }
    if (active === "true" || active === "false") {
      params.push(active === "true");
      clauses.push(`is_active = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = await databasePool.query(`SELECT count(*)::int AS count FROM app_users ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const rows = await databasePool.query(`SELECT * FROM app_users ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map(mapUser), total: total.rows[0].count };
  }

  async create(user: Omit<AppUser, "createdAt" | "updatedAt">): Promise<AppUser> {
    const result = await databasePool.query(
      `INSERT INTO app_users (id, full_name, email, role, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, user.fullName, user.email, user.role, user.isActive]
    );
    return mapUser(result.rows[0]);
  }

  async update(id: string, updates: { fullName?: string; role?: Role; isActive?: boolean }): Promise<AppUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.fullName !== undefined) { values.push(updates.fullName); fields.push(`full_name = $${values.length}`); }
    if (updates.role !== undefined) { values.push(updates.role); fields.push(`role = $${values.length}`); }
    if (updates.isActive !== undefined) { values.push(updates.isActive); fields.push(`is_active = $${values.length}`); }
    if (!fields.length) return this.findById(id);
    values.push(id);
    const result = await databasePool.query(
      `UPDATE app_users SET ${fields.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rowCount ? mapUser(result.rows[0]) : null;
  }

  async dashboardCounts() {
    const result = await databasePool.query(
      "SELECT count(*) FILTER (WHERE is_active)::int AS active, count(*) FILTER (WHERE NOT is_active)::int AS inactive FROM app_users"
    );
    return result.rows[0] as { active: number; inactive: number };
  }
}
