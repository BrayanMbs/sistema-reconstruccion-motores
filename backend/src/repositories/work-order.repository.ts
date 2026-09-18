import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { CreateWorkOrderDto } from "../dtos/admin.dtos";
import type { WorkOrder } from "../models/domain";

const mapOrder = (row: QueryResultRow): WorkOrder => ({
  id: row.id, code: row.code, trackingCode: row.tracking_code, clientId: row.client_id, clientName: row.client_name,
  engineBrand: row.engine_brand, engineModel: row.engine_model, engineSerial: row.engine_serial,
  serviceType: row.service_type, description: row.description, status: row.status,
  progress: row.progress, assignedWorkerId: row.assigned_worker_id, assignedWorker: row.assigned_worker_name ?? row.assigned_worker, estimatedDate: row.estimated_date,
  createdAt: row.created_at, intakeNotes: row.intake_notes, publicNote: row.public_note, priority: row.priority, startedAt: row.started_at, completedAt: row.completed_at
});

const selectSql = `SELECT o.*, c.full_name AS client_name, worker.full_name AS assigned_worker_name FROM work_orders o JOIN clients c ON c.id = o.client_id LEFT JOIN app_users worker ON worker.id = o.assigned_worker_id`;

export class WorkOrderRepository {
  async list(filters: { search?: string; status?: string; page: number; limit: number }) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.search) { params.push(`%${filters.search}%`); clauses.push(`(o.code ILIKE $${params.length} OR c.full_name ILIKE $${params.length} OR o.engine_brand ILIKE $${params.length} OR o.engine_model ILIKE $${params.length})`); }
    if (filters.status) { params.push(filters.status); clauses.push(`o.status = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = await databasePool.query(`SELECT count(*)::int AS count FROM work_orders o JOIN clients c ON c.id = o.client_id ${where}`, params);
    params.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await databasePool.query(`${selectSql} ${where} ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map(mapOrder), total: total.rows[0].count };
  }

  async findById(id: string): Promise<WorkOrder | null> {
    const result = await databasePool.query(`${selectSql} WHERE o.id = $1`, [id]);
    return result.rowCount ? mapOrder(result.rows[0]) : null;
  }

  async create(input: CreateWorkOrderDto, createdBy: string): Promise<WorkOrder> {
    const result = await databasePool.query(
      `INSERT INTO work_orders (code, client_id, engine_brand, engine_model, engine_serial, service_type, description, estimated_date, intake_notes, public_note, status, priority, created_by)
       VALUES ('OT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('work_order_code_seq')::text, 5, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'PENDING'), COALESCE($11, 'NORMAL'), $12)
       RETURNING id`,
      [input.clientId, input.engineBrand, input.engineModel, input.engineSerial ?? null, input.serviceType, input.description, input.estimatedDate ?? null, input.intakeNotes ?? null, input.publicNote ?? null, input.status ?? null, input.priority ?? null, createdBy]
    );
    const order = await this.findById(result.rows[0].id);
    if (!order) throw new Error("La orden creada no se encontró");
    return order;
  }

  async assignWorker(orderId: string, workerId: string): Promise<WorkOrder | null> {
    const result = await databasePool.query(
      `UPDATE work_orders SET assigned_worker_id = $2, assigned_worker = (SELECT full_name FROM app_users WHERE id = $2)
       WHERE id = $1 RETURNING id`,
      [orderId, workerId]
    );
    return result.rowCount ? this.findById(result.rows[0].id) : null;
  }

  async workerWorkload(workerId: string): Promise<number> { const result = await databasePool.query("SELECT count(*)::int AS count FROM work_orders WHERE assigned_worker_id = $1 AND status IN ('PENDING','IN_PROGRESS')", [workerId]); return result.rows[0].count; }

  async dashboardCounts() {
    const result = await databasePool.query(
      `SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        count(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
        count(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
       FROM work_orders`
    );
    return result.rows[0] as { total: number; pending: number; in_progress: number; completed: number };
  }
}
