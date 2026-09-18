import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { CreateClientDto, UpdateClientDto } from "../dtos/admin.dtos";
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
    if (search) { params.push(`%${search}%`); clauses.push(`(full_name ILIKE $${params.length} OR identification ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`); }
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

  async create(input: CreateClientDto): Promise<Client> {
    const result = await databasePool.query(
      `INSERT INTO clients (full_name, identification_type, identification, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.fullName, input.identificationType, input.identification, input.phone ?? null, input.email ?? null, input.address ?? null]
    );
    return mapClient(result.rows[0]);
  }

  async update(id: string, input: UpdateClientDto): Promise<Client | null> {
    const result = await databasePool.query(
      `UPDATE clients SET full_name = $2, identification_type = $3, identification = $4,
       phone = $5, email = $6, address = $7, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, input.fullName, input.identificationType, input.identification, input.phone ?? null, input.email ?? null, input.address ?? null]
    );
    return result.rowCount ? mapClient(result.rows[0]) : null;
  }

  async count(): Promise<number> {
    const result = await databasePool.query("SELECT count(*)::int AS count FROM clients");
    return result.rows[0].count;
  }
}
