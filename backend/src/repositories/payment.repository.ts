import type { PoolClient, QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { CreatePaymentDto } from "../dtos/finance.dtos";
import type { FinancialStatus, OrderFinancialSummary, Payment } from "../models/domain";
import { AppError } from "../utils/app-error";
import type { AuditService } from "../services/audit.service";

const selectSql = `
  SELECT p.*,
         o.code AS work_order_code,
         c.full_name AS client_name,
         u.full_name AS received_by_name
  FROM payments p
  JOIN work_orders o ON o.id = p.work_order_id
  JOIN clients c ON c.id = o.client_id
  LEFT JOIN app_users u ON u.id = p.received_by
`;

const mapPayment = (row: QueryResultRow): Payment => ({
  id: row.id,
  workOrderId: row.work_order_id,
  workOrderCode: row.work_order_code,
  clientName: row.client_name,
  amount: Number(row.amount),
  method: row.method,
  reference: row.reference,
  notes: row.notes,
  receivedBy: row.received_by_name,
  createdAt: row.created_at
});

export const computeFinancialStatus = (
  totalAmount: number | null,
  totalPaid: number,
  balance: number | null
): FinancialStatus => {
  if (totalAmount === null) return "PENDING";
  if (balance !== null && balance === 0) return "PAID";
  if (totalPaid > 0 && balance !== null && balance > 0) return "PARTIAL";
  return "PENDING";
};

export class PaymentRepository {
  async list(workOrderId?: string): Promise<Payment[]> {
    if (workOrderId) {
      const result = await databasePool.query(
        `${selectSql} WHERE p.work_order_id = $1 ORDER BY p.created_at DESC`,
        [workOrderId]
      );
      return result.rows.map(mapPayment);
    }
    const result = await databasePool.query(`${selectSql} ORDER BY p.created_at DESC`);
    return result.rows.map(mapPayment);
  }

  async listByWorkOrder(workOrderId: string): Promise<Payment[]> {
    return this.list(workOrderId);
  }

  async getTotalPaidForOrder(workOrderId: string, client?: PoolClient): Promise<number> {
    const executor = client ?? databasePool;
    const result = await executor.query(
      "SELECT COALESCE(SUM(amount), 0)::numeric(12,2) AS total_paid FROM payments WHERE work_order_id = $1",
      [workOrderId]
    );
    return Number(result.rows[0].total_paid);
  }

  async getFinancialSummary(workOrderId: string, client?: PoolClient): Promise<OrderFinancialSummary | null> {
    const executor = client ?? databasePool;
    const result = await executor.query(
      `SELECT o.id AS work_order_id,
              o.code AS work_order_code,
              c.full_name AS client_name,
              o.total_amount,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.work_order_id = o.id), 0)::numeric(12,2) AS total_paid
       FROM work_orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1`,
      [workOrderId]
    );

    if (!result.rowCount) return null;
    const row = result.rows[0];
    const totalAmount = row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null;
    const totalPaid = Number(row.total_paid);
    const balance = totalAmount !== null ? Math.max(0, Number((totalAmount - totalPaid).toFixed(2))) : null;
    const financialStatus = computeFinancialStatus(totalAmount, totalPaid, balance);

    return {
      workOrderId: row.work_order_id,
      workOrderCode: row.work_order_code,
      clientName: row.client_name,
      totalAmount,
      totalPaid,
      balance,
      financialStatus
    };
  }

  async listFinancialSummaries(search?: string): Promise<OrderFinancialSummary[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(o.code ILIKE $${params.length} OR c.full_name ILIKE $${params.length})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await databasePool.query(
      `SELECT o.id AS work_order_id,
              o.code AS work_order_code,
              c.full_name AS client_name,
              o.total_amount,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.work_order_id = o.id), 0)::numeric(12,2) AS total_paid
       FROM work_orders o
       JOIN clients c ON c.id = o.client_id
       ${where}
       ORDER BY o.created_at DESC`,
      params
    );

    return result.rows.map((row) => {
      const totalAmount = row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null;
      const totalPaid = Number(row.total_paid);
      const balance = totalAmount !== null ? Math.max(0, Number((totalAmount - totalPaid).toFixed(2))) : null;
      const financialStatus = computeFinancialStatus(totalAmount, totalPaid, balance);
      return {
        workOrderId: row.work_order_id,
        workOrderCode: row.work_order_code,
        clientName: row.client_name,
        totalAmount,
        totalPaid,
        balance,
        financialStatus
      };
    });
  }

  async createPaymentWithLock(
    input: CreatePaymentDto,
    actorId: string,
    auditService: AuditService
  ): Promise<{ payment: Payment; summary: OrderFinancialSummary }> {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");

      const orderRes = await client.query(
        `SELECT o.id, o.code, o.total_amount, c.full_name AS client_name
         FROM work_orders o
         JOIN clients c ON c.id = o.client_id
         WHERE o.id = $1
         FOR UPDATE`,
        [input.workOrderId]
      );

      if (!orderRes.rowCount) {
        throw new AppError("Orden de trabajo no encontrada", 404, "WORK_ORDER_NOT_FOUND");
      }

      const orderRow = orderRes.rows[0];
      if (orderRow.total_amount === null || orderRow.total_amount === undefined) {
        throw new AppError("La orden de trabajo no tiene un monto total aprobado", 422, "ORDER_TOTAL_NOT_DEFINED");
      }

      const totalAmount = Number(orderRow.total_amount);
      const paidRes = await client.query(
        "SELECT COALESCE(SUM(amount), 0)::numeric(12,2) AS total_paid FROM payments WHERE work_order_id = $1",
        [input.workOrderId]
      );
      const currentTotalPaid = Number(paidRes.rows[0].total_paid);
      const currentBalance = Number((totalAmount - currentTotalPaid).toFixed(2));

      if (currentBalance <= 0) {
        throw new AppError("La orden de trabajo ya ha sido pagada en su totalidad", 422, "ORDER_ALREADY_PAID");
      }

      const paymentAmount = Number(input.amount.toFixed(2));
      if (paymentAmount > currentBalance) {
        throw new AppError(
          `El monto del pago (Q ${paymentAmount.toFixed(2)}) supera el saldo pendiente (Q ${currentBalance.toFixed(2)})`,
          422,
          "PAYMENT_EXCEEDS_BALANCE"
        );
      }

      const insertRes = await client.query(
        `INSERT INTO payments (work_order_id, amount, method, reference, notes, received_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [input.workOrderId, paymentAmount, input.method, input.reference ?? null, input.notes ?? null, actorId]
      );
      const paymentId = insertRes.rows[0].id;
      const newTotalPaid = Number((currentTotalPaid + paymentAmount).toFixed(2));
      const newBalance = Number((totalAmount - newTotalPaid).toFixed(2));
      const newStatus = computeFinancialStatus(totalAmount, newTotalPaid, newBalance);

      await auditService.record(
        actorId,
        "PAYMENT_RECORDED",
        "PAYMENT",
        paymentId,
        {
          workOrderId: input.workOrderId,
          workOrderCode: orderRow.code,
          amount: paymentAmount,
          method: input.method,
          reference: input.reference ?? null,
          previousBalance: currentBalance,
          newBalance
        },
        client
      );

      await client.query("COMMIT");

      const paymentRes = await databasePool.query(`${selectSql} WHERE p.id = $1`, [paymentId]);
      return {
        payment: mapPayment(paymentRes.rows[0]),
        summary: {
          workOrderId: input.workOrderId,
          workOrderCode: orderRow.code,
          clientName: orderRow.client_name,
          totalAmount,
          totalPaid: newTotalPaid,
          balance: newBalance,
          financialStatus: newStatus
        }
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
