import { databasePool } from "../config/database";
import { AppError } from "../utils/app-error";
import { AuditService } from "../services/audit.service";

export class CashSessionRepository {
  async list(actorId: string) {
    const result = await databasePool.query(`SELECT s.id, s.opened_at AS "openedAt", s.closed_at AS "closedAt",
      s.opening_amount::float8 AS "openingAmount", s.counted_cash::float8 AS "countedCash",
      s.closing_notes AS "closingNotes",
      COALESCE(s.expected_cash, s.opening_amount + COALESCE(sum(p.amount) FILTER (WHERE lower(p.method) IN ('cash','efectivo')),0))::float8 AS "expectedCash",
      count(p.id)::int AS "paymentCount", COALESCE(sum(p.amount),0)::float8 AS "totalCollected",
      COALESCE(sum(p.amount) FILTER (WHERE lower(p.method) IN ('cash','efectivo')),0)::float8 AS "cashCollected"
      FROM cash_sessions s LEFT JOIN payments p ON p.cash_session_id=s.id
      WHERE s.cashier_id=$1 GROUP BY s.id ORDER BY s.opened_at DESC LIMIT 30`, [actorId]);
    return result.rows;
  }

  async change(actorId: string, amount: number, close: boolean, notes: string | null = null, sessionId?: string) {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      // Same lock is taken before a payment: a close cannot race with an incoming payment.
      await client.query("SELECT id FROM app_users WHERE id=$1 FOR UPDATE", [actorId]);
      const current = await client.query("SELECT id, opening_amount FROM cash_sessions WHERE cashier_id=$1 AND closed_at IS NULL FOR UPDATE", [actorId]);
      let id: string;
      if (close) {
        if (!current.rowCount) throw new AppError("No hay una caja abierta para cerrar.", 409, "CASH_SESSION_NOT_OPEN");
        if (sessionId !== current.rows[0].id) throw new AppError("La caja cambió. Actualiza la página antes de cerrar.",409,"CASH_SESSION_CHANGED");
        id = current.rows[0].id;
        const totals = await client.query("SELECT COALESCE(sum(amount) FILTER (WHERE lower(method) IN ('efectivo','cash')),0)::numeric AS cash FROM payments WHERE cash_session_id=$1", [id]);
        const expected = Number((Number(current.rows[0].opening_amount) + Number(totals.rows[0].cash)).toFixed(2));
        if (Math.round(amount * 100) !== Math.round(expected * 100) && !notes) throw new AppError("Explica la diferencia de efectivo antes de cerrar.",422,"CASH_DIFFERENCE_NOTE_REQUIRED");
        await client.query("UPDATE cash_sessions SET closed_at=clock_timestamp(), counted_cash=$2, expected_cash=$3, closing_notes=$4 WHERE id=$1", [id,amount,expected,notes]);
        await new AuditService().record(actorId,"CASH_SESSION_CLOSED","CASH_SESSION",id,{countedCash:amount,expectedCash:expected,notes},client);
      } else {
        if (current.rowCount) throw new AppError("Ya tienes una caja abierta.",409,"CASH_SESSION_ALREADY_OPEN");
        const inserted = await client.query("INSERT INTO cash_sessions(cashier_id,opening_amount) VALUES ($1,$2) RETURNING id", [actorId,amount]);
        id = inserted.rows[0].id;
        await new AuditService().record(actorId,"CASH_SESSION_OPENED","CASH_SESSION",id,{openingAmount:amount},client);
      }
      await client.query("COMMIT");
      return { id };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
