import { databasePool } from "../config/database";
import type { AuditEvent } from "../models/domain";

const mapAudit = (row: Record<string, unknown>): AuditEvent => ({ id: String(row.id), actorName: row.actor_name as string | null, action: String(row.action), entityType: String(row.entity_type), entityId: row.entity_id as string | null, details: (row.details ?? {}) as Record<string, unknown>, createdAt: String(row.created_at) });

export class AuditRepository {
  async record(input: { actorId?: string; action: string; entityType: string; entityId?: string; details?: Record<string, unknown> }): Promise<void> {
    await databasePool.query("INSERT INTO audit_events (actor_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5::jsonb)", [input.actorId ?? null, input.action, input.entityType, input.entityId ?? null, JSON.stringify(input.details ?? {})]);
  }

  async list(filters: { userId?: string; action?: string; from?: string; to?: string; page: number; limit: number }) {
    const clauses: string[] = []; const params: unknown[] = [];
    if (filters.userId) { params.push(filters.userId); clauses.push(`a.actor_id = $${params.length}`); }
    if (filters.action) { params.push(`%${filters.action}%`); clauses.push(`a.action ILIKE $${params.length}`); }
    if (filters.from) { params.push(filters.from); clauses.push(`a.created_at >= $${params.length}::date`); }
    if (filters.to) { params.push(filters.to); clauses.push(`a.created_at < ($${params.length}::date + interval '1 day')`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = await databasePool.query(`SELECT count(*)::int AS count FROM audit_events a ${where}`, params);
    params.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await databasePool.query(`SELECT a.*, u.full_name AS actor_name FROM audit_events a LEFT JOIN app_users u ON u.id = a.actor_id ${where} ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map(mapAudit), total: total.rows[0].count };
  }

  async recent(limit: number): Promise<AuditEvent[]> {
    const rows = await databasePool.query("SELECT a.*, u.full_name AS actor_name FROM audit_events a LEFT JOIN app_users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT $1", [limit]);
    return rows.rows.map(mapAudit);
  }
}
