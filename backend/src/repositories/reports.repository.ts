import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type {
  PaginatedReport,
  ReportClientFilters,
  ReportClientRow,
  ReportFinanceFilters,
  ReportFinanceRow,
  ReportOrderFilters,
  ReportOrderRow,
  ReportSummaryFilters
} from "../dtos/reports.dtos";
import { computeFinancialStatus } from "./payment.repository";

type SqlParts = { clauses: string[]; params: unknown[] };

const addParam = (parts: SqlParts, expression: string, value: unknown): void => {
  parts.params.push(value);
  parts.clauses.push(expression.replaceAll("?", `$${parts.params.length}`));
};

const addOrderPeriodFilters = (
  parts: SqlParts,
  filters: ReportSummaryFilters,
  alias = "o"
): void => {
  if (filters.startDate) addParam(parts, `(${alias}.created_at AT TIME ZONE 'America/Guatemala') >= ?::date`, filters.startDate);
  if (filters.endDate) addParam(parts, `(${alias}.created_at AT TIME ZONE 'America/Guatemala') < (?::date + interval '1 day')`, filters.endDate);
  if (filters.status) addParam(parts, `${alias}.status = ?`, filters.status);
};

const whereSql = (parts: SqlParts): string => parts.clauses.length ? `WHERE ${parts.clauses.join(" AND ")}` : "";

const mapOrder = (row: QueryResultRow): ReportOrderRow => {
  const totalAmount = row.total_amount === null ? null : Number(row.total_amount);
  const totalPaid = Number(row.total_paid);
  const balance = row.balance === null ? null : Number(row.balance);
  return {
    id: row.id, code: row.code, clientId: row.client_id, clientName: row.client_name,
    engineBrand: row.engine_brand, engineModel: row.engine_model, serviceType: row.service_type,
    status: row.status, progress: row.progress, priority: row.priority,
    assignedWorker: row.assigned_worker_name ?? row.assigned_worker ?? null,
    estimatedDate: row.estimated_date, createdAt: row.created_at, completedAt: row.completed_at,
    totalAmount, totalPaid, balance,
    financialStatus: computeFinancialStatus(totalAmount, totalPaid, balance)
  };
};

const mapClient = (row: QueryResultRow): ReportClientRow => ({
  id: row.id, fullName: row.full_name, identificationType: row.identification_type,
  identification: row.identification, phone: row.phone, email: row.email, createdAt: row.created_at,
  orderCount: row.order_count, pendingOrders: row.pending_orders, inProgressOrders: row.in_progress_orders,
  completedOrders: row.completed_orders, cancelledOrders: row.cancelled_orders, lastOrderAt: row.last_order_at
});

const mapFinance = (row: QueryResultRow): ReportFinanceRow => ({
  id: row.id, workOrderId: row.work_order_id, workOrderCode: row.work_order_code,
  clientName: row.client_name, amount: Number(row.amount), method: row.method,
  reference: row.reference, receivedBy: row.received_by_name, createdAt: row.created_at
});

export class ReportsRepository {
  async summary(filters: ReportSummaryFilters) {
    const orderParts: SqlParts = { clauses: [], params: [] };
    addOrderPeriodFilters(orderParts, filters);
    const paymentParts: SqlParts = { clauses: [], params: [] };
    if (filters.startDate) addParam(paymentParts, "(p.created_at AT TIME ZONE 'America/Guatemala') >= ?::date", filters.startDate);
    if (filters.endDate) addParam(paymentParts, "(p.created_at AT TIME ZONE 'America/Guatemala') < (?::date + interval '1 day')", filters.endDate);
    if (filters.status) addParam(paymentParts, "o.status = ?", filters.status);

    const [orders, inventory, finance] = await Promise.all([
      databasePool.query(
        `SELECT count(*) FILTER (WHERE o.status = 'PENDING')::int AS pending,
                count(*) FILTER (WHERE o.status = 'IN_PROGRESS')::int AS in_progress,
                count(*) FILTER (WHERE o.status = 'COMPLETED')::int AS completed,
                count(*) FILTER (WHERE o.status = 'CANCELLED')::int AS cancelled,
                count(*)::int AS total,
                count(*) FILTER (WHERE o.assigned_worker_id IS NOT NULL)::int AS assigned
         FROM work_orders o ${whereSql(orderParts)}`,
        orderParts.params
      ),
      databasePool.query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE is_active = true AND stock_quantity <= minimum_stock)::int AS low_stock
         FROM inventory_items`
      ),
      databasePool.query(
        `SELECT COALESCE(sum(p.amount), 0)::numeric(14,2) AS total, count(*)::int AS payments
         FROM payments p JOIN work_orders o ON o.id = p.work_order_id ${whereSql(paymentParts)}`,
        paymentParts.params
      )
    ]);
    const orderRow = orders.rows[0];
    const financeRow = finance.rows[0];
    return {
      orders: {
        PENDING: orderRow.pending, IN_PROGRESS: orderRow.in_progress,
        COMPLETED: orderRow.completed, CANCELLED: orderRow.cancelled
      },
      inventory: inventory.rows[0],
      finance: { total: Number(financeRow.total), payments: financeRow.payments },
      assignments: { total: orderRow.total, assigned: orderRow.assigned },
      scope: {
        startDate: filters.startDate ?? null, endDate: filters.endDate ?? null, status: filters.status ?? null,
        inventoryIsCurrentState: true
      }
    };
  }

  async orders(filters: ReportOrderFilters): Promise<PaginatedReport<ReportOrderRow>> {
    const parts: SqlParts = { clauses: [], params: [] };
    addOrderPeriodFilters(parts, filters);
    if (filters.search) {
      addParam(parts, "(o.code ILIKE ? OR c.full_name ILIKE ? OR o.engine_brand ILIKE ? OR o.engine_model ILIKE ?)", `%${filters.search}%`);
    }
    const where = whereSql(parts);
    const total = await databasePool.query(
      `SELECT count(*)::int AS count FROM work_orders o JOIN clients c ON c.id = o.client_id ${where}`,
      [...parts.params]
    );
    parts.params.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await databasePool.query(
      `SELECT o.id,o.code,o.client_id,c.full_name AS client_name,o.engine_brand,o.engine_model,o.service_type,
              o.status,o.progress,o.priority,o.assigned_worker,worker.full_name AS assigned_worker_name,
              o.estimated_date,o.created_at,o.completed_at,o.total_amount,
              COALESCE(payments.total_paid,0)::numeric(14,2) AS total_paid,
              CASE WHEN o.total_amount IS NULL THEN NULL
                   ELSE GREATEST(o.total_amount - COALESCE(payments.total_paid,0),0)::numeric(14,2) END AS balance
       FROM work_orders o
       JOIN clients c ON c.id = o.client_id
       LEFT JOIN app_users worker ON worker.id = o.assigned_worker_id
       LEFT JOIN LATERAL (SELECT sum(p.amount) AS total_paid FROM payments p WHERE p.work_order_id = o.id) payments ON true
       ${where} ORDER BY o.created_at DESC LIMIT $${parts.params.length - 1} OFFSET $${parts.params.length}`,
      parts.params
    );
    return { items: rows.rows.map(mapOrder), total: total.rows[0].count, page: filters.page, limit: filters.limit };
  }

  async clients(filters: ReportClientFilters): Promise<PaginatedReport<ReportClientRow>> {
    const activityParts: SqlParts = { clauses: [], params: [] };
    addOrderPeriodFilters(activityParts, filters);
    const clientClauses: string[] = [];
    if (filters.search) {
      activityParts.params.push(`%${filters.search}%`);
      const parameter = `$${activityParts.params.length}`;
      clientClauses.push(`(c.full_name ILIKE ${parameter} OR c.identification ILIKE ${parameter} OR c.email ILIKE ${parameter})`);
    }
    if (filters.startDate || filters.endDate || filters.status) {
      clientClauses.push("EXISTS (SELECT 1 FROM filtered_orders matched WHERE matched.client_id = c.id)");
    }
    const clientWhere = clientClauses.length ? `WHERE ${clientClauses.join(" AND ")}` : "";
    const cte = `WITH filtered_orders AS (SELECT o.* FROM work_orders o ${whereSql(activityParts)})`;
    const total = await databasePool.query(
      `${cte} SELECT count(*)::int AS count FROM clients c ${clientWhere}`,
      [...activityParts.params]
    );
    activityParts.params.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await databasePool.query(
      `${cte}
       SELECT c.id,c.full_name,c.identification_type,c.identification,c.phone,c.email,c.created_at,
              count(fo.id)::int AS order_count,
              count(fo.id) FILTER (WHERE fo.status='PENDING')::int AS pending_orders,
              count(fo.id) FILTER (WHERE fo.status='IN_PROGRESS')::int AS in_progress_orders,
              count(fo.id) FILTER (WHERE fo.status='COMPLETED')::int AS completed_orders,
              count(fo.id) FILTER (WHERE fo.status='CANCELLED')::int AS cancelled_orders,
              max(fo.created_at) AS last_order_at
       FROM clients c LEFT JOIN filtered_orders fo ON fo.client_id = c.id
       ${clientWhere} GROUP BY c.id ORDER BY last_order_at DESC NULLS LAST,c.created_at DESC
       LIMIT $${activityParts.params.length - 1} OFFSET $${activityParts.params.length}`,
      activityParts.params
    );
    return { items: rows.rows.map(mapClient), total: total.rows[0].count, page: filters.page, limit: filters.limit };
  }

  async finance(filters: ReportFinanceFilters): Promise<PaginatedReport<ReportFinanceRow>> {
    const parts: SqlParts = { clauses: [], params: [] };
    if (filters.startDate) addParam(parts, "(p.created_at AT TIME ZONE 'America/Guatemala') >= ?::date", filters.startDate);
    if (filters.endDate) addParam(parts, "(p.created_at AT TIME ZONE 'America/Guatemala') < (?::date + interval '1 day')", filters.endDate);
    if (filters.status) addParam(parts, "o.status = ?", filters.status);
    if (filters.method) addParam(parts, "p.method = ?", filters.method);
    if (filters.search) addParam(parts, "(o.code ILIKE ? OR c.full_name ILIKE ? OR p.reference ILIKE ?)", `%${filters.search}%`);
    const where = whereSql(parts);
    const joins = "FROM payments p JOIN work_orders o ON o.id=p.work_order_id JOIN clients c ON c.id=o.client_id LEFT JOIN app_users u ON u.id=p.received_by";
    const total = await databasePool.query(`SELECT count(*)::int AS count ${joins} ${where}`, [...parts.params]);
    parts.params.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await databasePool.query(
      `SELECT p.id,p.work_order_id,o.code AS work_order_code,c.full_name AS client_name,p.amount,p.method,
              p.reference,u.full_name AS received_by_name,p.created_at ${joins} ${where}
       ORDER BY p.created_at DESC LIMIT $${parts.params.length - 1} OFFSET $${parts.params.length}`,
      parts.params
    );
    return { items: rows.rows.map(mapFinance), total: total.rows[0].count, page: filters.page, limit: filters.limit };
  }
}

