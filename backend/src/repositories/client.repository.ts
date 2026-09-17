import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { Client } from "../models/domain";

const mapClient = (row: QueryResultRow): Client => ({
  id: row.id,
  fullName: row.full_name,
  identificationType: row.identification_type,
  identification: row.identification,
  phone: row.phone,
  email: row.email,
  address: row.address,
  createdAt: row.created_at
});

export class ClientRepository {
  async list(search: string | undefined, identificationType: string | undefined, page: number, limit: number) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (search) { params.push(`%${search}%`); clauses.push(`(full_name ILIKE $${params.length} OR identification ILIKE $${params.length} OR phone ILIKE $${params.length})`); }
    if (identificationType) { params.push(identificationType); clauses.push(`identification_type = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = await databasePool.query(`SELECT count(*)::int AS count FROM clients ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const rows = await databasePool.query(`SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map(mapClient), total: total.rows[0].count };
  }

  async findById(id: string): Promise<Client | null> {
    const result = await databasePool.query("SELECT * FROM clients WHERE id = $1", [id]);
    return result.rowCount ? mapClient(result.rows[0]) : null;
  }

  async count(): Promise<number> {
    const result = await databasePool.query("SELECT count(*)::int AS count FROM clients");
    return result.rows[0].count;
  }
}
