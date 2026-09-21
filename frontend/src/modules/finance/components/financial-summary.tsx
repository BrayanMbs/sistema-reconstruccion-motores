import type { OrderFinancialSummary, Payment } from "../models/finance";

type Props = {
  payments: Payment[];
  orderSummaries: OrderFinancialSummary[];
};

export function FinancialSummaryCards({ payments, orderSummaries }: Props) {
  const totalIncome = payments.reduce((sum, item) => sum + item.amount, 0);

  const pendingOrders = orderSummaries.filter(
    (order) => order.totalAmount !== null && order.financialStatus !== "PAID"
  );
  const totalPendingBalance = pendingOrders.reduce(
    (sum, order) => sum + (order.balance ?? 0),
    0
  );

  const fullyPaidOrders = orderSummaries.filter((order) => order.financialStatus === "PAID").length;
  const unapprovedOrders = orderSummaries.filter((order) => order.totalAmount === null).length;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="stitch-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ingresos registrados
        </p>
        <strong className="mt-2 block text-3xl font-bold text-emerald-700">
          Q {totalIncome.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </strong>
        <span className="mt-1 block text-xs text-slate-500">
          {payments.length} movimiento(s) registrado(s)
        </span>
      </div>

      <div className="stitch-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Saldo por cobrar
        </p>
        <strong className="mt-2 block text-3xl font-bold text-amber-700">
          Q {totalPendingBalance.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </strong>
        <span className="mt-1 block text-xs text-slate-500">
          En {pendingOrders.length} orden(es) activas
        </span>
      </div>

      <div className="stitch-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Órdenes pagadas
        </p>
        <strong className="mt-2 block text-3xl font-bold text-blue-700">
          {fullyPaidOrders}
        </strong>
        <span className="mt-1 block text-xs text-slate-500">
          Saldo completado (Q 0.00)
        </span>
      </div>

      <div className="stitch-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Pendientes de cotizar
        </p>
        <strong className="mt-2 block text-3xl font-bold text-slate-700">
          {unapprovedOrders}
        </strong>
        <span className="mt-1 block text-xs text-slate-500">
          Sin total aprobado
        </span>
      </div>
    </div>
  );
}
