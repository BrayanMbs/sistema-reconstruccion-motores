"use client";

import { useMemo, useState } from "react";
import type { Payment } from "../models/finance";
import { Icon } from "@/shared/components/icon";

type PaymentHistoryProps = {
  payments: Payment[];
};

export function PaymentHistoryTable({ payments }: PaymentHistoryProps) {
  const [search, setSearch] = useState("");

  const filteredPayments = useMemo(() => {
    if (!search.trim()) {
      return payments;
    }
    const query = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.workOrderCode.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query) ||
        (p.reference && p.reference.toLowerCase().includes(query)) ||
        p.method.toLowerCase().includes(query)
    );
  }, [payments, search]);

  const formatDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat("es-GT", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <section className="stitch-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Historial de pagos</h3>
          <p className="text-xs text-slate-500">
            Registro cronológico de todos los cobros y abonos recibidos
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon name="search" />
          </span>
          <input
            type="text"
            placeholder="Buscar por orden, cliente, ref..."
            className="stitch-input w-full pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="stitch-table">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Método</th>
              <th>Referencia</th>
              <th>Registrado por</th>
              <th className="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id}>
                <td className="text-xs text-slate-600">{formatDate(payment.createdAt)}</td>
                <td className="font-semibold text-blue-700">{payment.workOrderCode}</td>
                <td className="text-slate-800">{payment.clientName}</td>
                <td>
                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {payment.method}
                  </span>
                </td>
                <td className="text-xs text-slate-600">
                  {payment.reference ? (
                    <span className="font-mono text-slate-700">{payment.reference}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="text-xs text-slate-600">
                  {payment.receivedBy ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="text-right font-bold text-emerald-700">
                  Q {payment.amount.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm text-slate-500">
                  {search
                    ? "No se encontraron pagos con el criterio de búsqueda especificado."
                    : "Aún no hay pagos registrados en el sistema."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
