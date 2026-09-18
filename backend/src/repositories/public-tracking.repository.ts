import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { PublicOrderTracking, PublicTrackingMilestone } from "../models/domain";

const mapTracking = (row: QueryResultRow): PublicOrderTracking => ({
  orderNumber: row.order_number,
  status: row.status,
  progress: Number(row.progress),
  serviceDescription: row.public_note,
  serviceType: row.service_type,
  engineSummary: `${row.engine_brand} ${row.engine_model}`.trim(),
  receivedAt: row.received_at,
  estimatedDate: row.estimated_date,
  lastUpdatedAt: row.last_updated_at,
  timeline: []
});

const publicMilestone = (row: QueryResultRow): PublicTrackingMilestone => {
  const details = {
    WORK_STARTED: { title: "Reparación iniciada", message: "La orden ingresó al proceso técnico." },
    PROGRESS_UPDATED: { title: "Avance técnico actualizado", message: "El progreso de la reparación fue actualizado." },
    WORK_COMPLETED: { title: "Reparación finalizada", message: "La reparación fue marcada como finalizada." }
  } as const;
  const detail = details[row.event_type as keyof typeof details];
  return { type: row.event_type, title: detail.title, message: detail.message, progress: row.progress === null ? null : Number(row.progress), occurredAt: row.created_at };
};

export class PublicTrackingRepository {
  async find(orderNumber: string, trackingCode: string): Promise<PublicOrderTracking | null> {
    const result = await databasePool.query(
      `SELECT o.id AS work_order_id, o.code AS order_number, o.status, o.progress, o.public_note, o.service_type,
              o.engine_brand, o.engine_model, o.created_at AS received_at, o.estimated_date,
              COALESCE((SELECT MAX(e.created_at) FROM work_order_events e WHERE e.work_order_id = o.id), o.completed_at, o.started_at, o.created_at) AS last_updated_at
       FROM work_orders o
       WHERE o.code = $1 AND o.tracking_code = $2`,
      [orderNumber, trackingCode]
    );
    if (!result.rowCount) return null;
    const order = mapTracking(result.rows[0]);
    const events = await databasePool.query(
      `SELECT event_type, progress, created_at
       FROM work_order_events
       WHERE work_order_id = $1 AND event_type IN ('WORK_STARTED', 'PROGRESS_UPDATED', 'WORK_COMPLETED')
       ORDER BY created_at DESC
       LIMIT 6`,
      [result.rows[0].work_order_id]
    );
    return {
      ...order,
      timeline: [
        { type: "ORDER_RECEIVED", title: "Orden recibida", message: "El motor fue recibido y la orden quedó registrada.", progress: 0, occurredAt: order.receivedAt },
        ...events.rows.reverse().map(publicMilestone)
      ]
    };
  }
}
