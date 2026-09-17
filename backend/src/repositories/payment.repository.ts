import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { CreatePaymentDto } from "../dtos/admin.dtos";
import type { Payment } from "../models/domain";

const selectSql = "SELECT p.*, o.code AS work_order_code, c.full_name AS client_name, u.full_name AS received_by_name FROM payments p JOIN work_orders o ON o.id = p.work_order_id JOIN clients c ON c.id = o.client_id LEFT JOIN app_users u ON u.id = p.received_by";
const mapPayment = (row: QueryResultRow): Payment => ({ id: row.id, workOrderId: row.work_order_id, workOrderCode: row.work_order_code, clientName: row.client_name, amount: Number(row.amount), method: row.method, reference: row.reference, notes: row.notes, receivedBy: row.received_by_name, createdAt: row.created_at });
export class PaymentRepository { async list() { const result = await databasePool.query(`${selectSql} ORDER BY p.created_at DESC`); return result.rows.map(mapPayment); } async create(input: CreatePaymentDto, actorId: string) { const result = await databasePool.query("INSERT INTO payments (work_order_id, amount, method, reference, notes, received_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [input.workOrderId, input.amount, input.method, input.reference ?? null, input.notes ?? null, actorId]); const payment = await databasePool.query(`${selectSql} WHERE p.id = $1`, [result.rows[0].id]); return mapPayment(payment.rows[0]); } }
