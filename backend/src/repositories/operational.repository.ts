import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { OperatorNotification, WorkOrder, WorkOrderEvent } from "../models/domain";

const mapOrder = (row: QueryResultRow): WorkOrder => ({ id: row.id, code: row.code, trackingCode: row.tracking_code, clientId: row.client_id, clientName: row.client_name, engineBrand: row.engine_brand, engineModel: row.engine_model, engineSerial: row.engine_serial, serviceType: row.service_type, description: row.description, status: row.status, progress: Number(row.progress), assignedWorkerId: row.assigned_worker_id, assignedWorker: row.assigned_worker_name ?? row.assigned_worker, estimatedDate: row.estimated_date, createdAt: row.created_at, intakeNotes: row.intake_notes, publicNote: row.public_note, priority: row.priority, startedAt: row.started_at, completedAt: row.completed_at });
const mapEvent = (row: QueryResultRow): WorkOrderEvent => ({ id: row.id, workOrderId: row.work_order_id, actorName: row.actor_name, eventType: row.event_type, message: row.message, progress: row.progress === null ? null : Number(row.progress), createdAt: row.created_at });
const baseSelect = "SELECT o.*, c.full_name AS client_name, worker.full_name AS assigned_worker_name FROM work_orders o JOIN clients c ON c.id = o.client_id LEFT JOIN app_users worker ON worker.id = o.assigned_worker_id";

export class OperationalRepository {
  async listOrders(workerId: string, filters: { search?: string; status?: string; priority?: string; date?: string; page: number; limit: number }) {
    const clauses = ["o.assigned_worker_id = $1"]; const params: unknown[] = [workerId];
    if (filters.search) { params.push(`%${filters.search}%`); clauses.push(`(o.code ILIKE $${params.length} OR o.engine_brand ILIKE $${params.length} OR o.engine_model ILIKE $${params.length})`); }
    if (filters.status) { params.push(filters.status); clauses.push(`o.status = $${params.length}`); }
    if (filters.priority) { params.push(filters.priority); clauses.push(`o.priority = $${params.length}`); }
    if (filters.date === "OVERDUE") clauses.push("o.estimated_date < CURRENT_DATE AND o.status IN ('PENDING','IN_PROGRESS')");
    if (filters.date === "UPCOMING") clauses.push("o.estimated_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND o.status IN ('PENDING','IN_PROGRESS')");
    const where = `WHERE ${clauses.join(" AND ")}`;
    const total = await databasePool.query(`SELECT count(*)::int AS count FROM work_orders o ${where}`, params);
    params.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await databasePool.query(`${baseSelect} ${where} ORDER BY CASE o.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, o.estimated_date NULLS LAST, o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map(mapOrder), total: Number(total.rows[0].count) };
  }

  async findOwnedOrder(workerId: string, orderId: string) { const result = await databasePool.query(`${baseSelect} WHERE o.id = $1 AND o.assigned_worker_id = $2`, [orderId, workerId]); return result.rowCount ? mapOrder(result.rows[0]) : null; }
  async dashboard(workerId: string) {
    const counts = await databasePool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'PENDING')::int AS pending, count(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress, count(*) FILTER (WHERE status = 'COMPLETED' AND completed_at::date = CURRENT_DATE)::int AS completed_today, count(*) FILTER (WHERE priority = 'URGENT' AND status IN ('PENDING','IN_PROGRESS'))::int AS urgent, count(*) FILTER (WHERE estimated_date < CURRENT_DATE AND status IN ('PENDING','IN_PROGRESS'))::int AS overdue, count(*) FILTER (WHERE estimated_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3 AND status IN ('PENDING','IN_PROGRESS'))::int AS due_soon FROM work_orders WHERE assigned_worker_id = $1`, [workerId]);
    const upcoming = await this.listOrders(workerId, { page: 1, limit: 5 }); return { ...counts.rows[0], upcoming: upcoming.items };
  }
  async events(workerId: string, orderId?: string) { const result = await databasePool.query(`SELECT e.*, actor.full_name AS actor_name FROM work_order_events e LEFT JOIN app_users actor ON actor.id = e.actor_id WHERE e.subject_worker_id = $1 ${orderId ? "AND e.work_order_id = $2" : ""} ORDER BY e.created_at DESC`, orderId ? [workerId, orderId] : [workerId]); return result.rows.map(mapEvent); }
  async eventsForOrder(orderId: string) { const result = await databasePool.query("SELECT e.*, actor.full_name AS actor_name FROM work_order_events e LEFT JOIN app_users actor ON actor.id = e.actor_id WHERE e.work_order_id = $1 ORDER BY e.created_at DESC", [orderId]); return result.rows.map(mapEvent); }
  async start(workerId: string, orderId: string) { return this.change(workerId, orderId, "START"); }
  async progress(workerId: string, orderId: string, progress: number, observation: string) { return this.change(workerId, orderId, "PROGRESS", progress, observation); }
  async complete(workerId: string, orderId: string, observation: string) { return this.change(workerId, orderId, "COMPLETE", 100, observation); }
  private async change(workerId: string, orderId: string, action: "START" | "PROGRESS" | "COMPLETE", progress?: number, observation?: string) {
    const connection = await databasePool.connect();
    try {
      await connection.query("BEGIN");
      const current = await connection.query("SELECT o.*, c.full_name AS client_name, worker.full_name AS assigned_worker_name FROM work_orders o JOIN clients c ON c.id = o.client_id LEFT JOIN app_users worker ON worker.id = o.assigned_worker_id WHERE o.id = $1 FOR UPDATE OF o", [orderId]);
      if (!current.rowCount) throw new Error("ORDER_NOT_FOUND");
      const order = mapOrder(current.rows[0]);
      if (order.assignedWorkerId !== workerId) throw new Error("ORDER_NOT_OWNED");
      if (action === "START") { if (order.status !== "PENDING") throw new Error("ORDER_CANNOT_START"); await connection.query("UPDATE work_orders SET status = 'IN_PROGRESS', started_at = now() WHERE id = $1", [orderId]); await this.recordEvent(connection, workerId, orderId, "WORK_STARTED", "Trabajo iniciado", 0); }
      if (action === "PROGRESS") { if (order.status !== "IN_PROGRESS") throw new Error("ORDER_NOT_IN_PROGRESS"); if (progress === undefined || progress < order.progress) throw new Error("PROGRESS_DECREASE"); await connection.query("UPDATE work_orders SET progress = $2 WHERE id = $1", [orderId, progress]); await this.recordEvent(connection, workerId, orderId, "PROGRESS_UPDATED", observation ?? "Avance actualizado", progress); }
      if (action === "COMPLETE") { if (order.status !== "IN_PROGRESS") throw new Error("ORDER_CANNOT_COMPLETE"); await connection.query("UPDATE work_orders SET status = 'COMPLETED', progress = 100, completed_at = now() WHERE id = $1", [orderId]); await this.recordEvent(connection, workerId, orderId, "WORK_COMPLETED", observation ?? "Trabajo finalizado", 100); }
      await connection.query("COMMIT"); return this.findOwnedOrder(workerId, orderId);
    } catch (error) { await connection.query("ROLLBACK"); throw error; } finally { connection.release(); }
  }
  async recordAssignment(actorId: string, workerId: string, orderId: string, code: string) { await databasePool.query("INSERT INTO work_order_events (work_order_id, actor_id, subject_worker_id, event_type, message) VALUES ($1,$2,$3,'ORDER_ASSIGNED',$4)", [orderId, actorId, workerId, `Nueva orden asignada: ${code}`]); }
  private async recordEvent(connection: { query: (query: string, values?: unknown[]) => Promise<unknown> }, workerId: string, orderId: string, type: string, message: string, progress: number) { await connection.query("INSERT INTO work_order_events (work_order_id, actor_id, subject_worker_id, event_type, message, progress) VALUES ($1,$2,$2,$3,$4,$5)", [orderId, workerId, type, message, progress]); }
}

export class OperatorNotificationRepository {
  async create(userId: string, workOrderId: string, type: string, message: string) { await databasePool.query("INSERT INTO operator_notifications (user_id, work_order_id, type, message) VALUES ($1,$2,$3,$4)", [userId, workOrderId, type, message]); }
  async list(userId: string): Promise<OperatorNotification[]> { const result = await databasePool.query("SELECT n.*, o.code AS work_order_code FROM operator_notifications n LEFT JOIN work_orders o ON o.id = n.work_order_id WHERE n.user_id = $1 ORDER BY n.created_at DESC", [userId]); return result.rows.map((row) => ({ id: row.id, workOrderId: row.work_order_id, workOrderCode: row.work_order_code, type: row.type, message: row.message, readAt: row.read_at, createdAt: row.created_at })); }
  async markRead(userId: string, id: string) { const result = await databasePool.query("UPDATE operator_notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]); return (result.rowCount ?? 0) > 0; }
}
