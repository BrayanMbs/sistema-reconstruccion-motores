import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";

export type TimelineSourceEvent = { id: string; source: "ORDER" | "OPERATIONAL" | "INVENTORY"; eventType: string; occurredAt: string; actorId: string | null; actorName: string | null; subjectName: string | null; message: string | null; progress: number | null };

const mapEvent = (row: QueryResultRow): TimelineSourceEvent => ({
  id: String(row.id), source: row.source, eventType: String(row.event_type), occurredAt: String(row.occurred_at),
  actorId: row.actor_id ? String(row.actor_id) : null, actorName: row.actor_name ? String(row.actor_name) : null,
  subjectName: row.subject_name ? String(row.subject_name) : null, message: row.message ? String(row.message) : null,
  progress: row.progress === null ? null : Number(row.progress)
});

export class OrderTimelineRepository {
  async list(orderId: string): Promise<TimelineSourceEvent[]> {
    const result = await databasePool.query(`
      SELECT 'order:' || o.id::text AS id, 'ORDER' AS source, 'ORDER_CREATED' AS event_type, o.created_at AS occurred_at, creator.id AS actor_id, creator.full_name AS actor_name, NULL::text AS subject_name, NULL::text AS message, NULL::numeric AS progress
      FROM work_orders o LEFT JOIN app_users creator ON creator.id = o.created_by WHERE o.id = $1
      UNION ALL
      SELECT 'event:' || e.id::text AS id, 'OPERATIONAL' AS source, e.event_type, e.created_at AS occurred_at, actor.id AS actor_id, actor.full_name AS actor_name, subject.full_name AS subject_name, e.message, e.progress
      FROM work_order_events e LEFT JOIN app_users actor ON actor.id = e.actor_id LEFT JOIN app_users subject ON subject.id = e.subject_worker_id
      WHERE e.work_order_id = $1 AND e.event_type IN ('ORDER_ASSIGNED', 'WORK_STARTED', 'PROGRESS_UPDATED', 'WORK_COMPLETED')
      UNION ALL
      SELECT 'inventory:' || m.id::text AS id, 'INVENTORY' AS source, m.movement_type, m.created_at AS occurred_at, actor.id AS actor_id, actor.full_name AS actor_name, NULL::text AS subject_name, NULL::text AS message, NULL::numeric AS progress
      FROM inventory_movements m LEFT JOIN app_users actor ON actor.id = m.performed_by
      WHERE m.work_order_id = $1 AND m.movement_type IN ('ENTRY', 'EXIT')
    `, [orderId]);
    return result.rows.map(mapEvent);
  }
}
