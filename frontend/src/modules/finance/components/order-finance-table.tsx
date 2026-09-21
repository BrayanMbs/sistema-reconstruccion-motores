"use client";

import { useMemo, useState } from "react";
import type { FinancialStatus, OrderFinancialSummary } from "../models/finance";
import { FINANCIAL_STATUS_BADGE_CLASSES, FINANCIAL_STATUS_LABELS } from "../models/finance";
import { Icon } from "@/shared/components/icon";

type FilterTab = "ALL" | "PENDING" | "PARTIAL" | "PAID" | "UNQUOTED";

type OrderFinanceTableProps = {
  orderSummaries: OrderFinancialSummary[];
  onDefineTotal: (order: OrderFinancialSummary) => void;
  onRegisterPayment: (order: OrderFinancialSummary) => void;
};

export function OrderFinanceTable({
  orderSummaries,
  onDefineTotal,
  onRegisterPayment
}: OrderFinanceTableProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");

  const filteredSummaries = useMemo(() => {
    return orderSummaries.filter((order) => {
      // Tab filter
      if (filterTab === "UNQUOTED" && order.totalAmount !== null) {
        return false;
      }
      if (filterTab === "PENDING" && (order.totalAmount === null || order.financialStatus !== "PENDING")) {
        return false;
      }
      if (filterTab === "PARTIAL" && order.financialStatus !== "PARTIAL") {
        return false;
      }
      if (filterTab === "PAID" && order.financialStatus !== "PAID") {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          order.workOrderCode.toLowerCase().includes(query) ||
          order.clientName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [orderSummaries, filterTab, search]);

  const counts = useMemo(() => {
    return {
      ALL: orderSummaries.length,
      PENDING: orderSummaries.filter((o) => o.totalAmount !== null && o.financialStatus === "PENDING").length,
      PARTIAL: orderSummaries.filter((o) => o.financialStatus === "PARTIAL").length,
      PAID: orderSummaries.filter((o) => o.financialStatus === "PAID").length,
      UNQUOTED: orderSummaries.filter((o) => o.totalAmount === null).length
    };
  }, [orderSummaries]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "ALL", label: "Todas", count: counts.ALL },
    { key: "PENDING", label: "Pendientes", count: counts.PENDING },
    { key: "PARTIAL", label: "Con abonos", count: counts.PARTIAL },
    { key: "PAID", label: "Pagadas", count: counts.PAID },
    { key: "UNQUOTED", label: "Sin cotizar", count: counts.UNQUOTED }
  ];

  return (
    <section className="stitch-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Estado financiero de órdenes</h3>
          <p className="text-xs text-slate-500">
            Control de cotizaciones aprobadas, abonos recibidos y saldos pendientes por orden
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon name="search" />
          </span>
          <input
            type="text"
            placeholder="Buscar orden o cliente..."
            className="stitch-input w-full pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 text-xs font-medium">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterTab(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors ${
              filterTab === tab.key
                ? "border-blue-600 font-semibold text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                filterTab === tab.key ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="stitch-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Cliente</th>
              <th className="text-right">Total aprobado</th>
              <th className="text-right">Total pagado</th>
              <th className="text-right">Saldo pendiente</th>
              <th className="text-center">Estado financiero</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSummaries.map((order) => {
              const hasTotal = order.totalAmount !== null;
              const isPaid = order.financialStatus === "PAID";
              const canPay = hasTotal && !isPaid;

              return (
                <tr key={order.workOrderId}>
                  <td className="font-semibold text-blue-700">{order.workOrderCode}</td>
                  <td className="text-slate-800">{order.clientName}</td>
                  <td className="text-right font-medium">
                    {hasTotal ? (
                      `Q ${order.totalAmount?.toLocaleString("es-GT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}`
                    ) : (
                      <span className="text-xs italic text-slate-400">Sin definir</span>
                    )}
                  </td>
                  <td className="text-right font-medium text-emerald-700">
                    Q {order.totalPaid.toLocaleString("es-GT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="text-right font-bold">
                    {order.balance !== null ? (
                      <span className={order.balance > 0 ? "text-amber-700" : "text-slate-400"}>
                        Q {order.balance.toLocaleString("es-GT", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    {hasTotal ? (
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          FINANCIAL_STATUS_BADGE_CLASSES[order.financialStatus as FinancialStatus]
                        }`}
                      >
                        {FINANCIAL_STATUS_LABELS[order.financialStatus as FinancialStatus]}
                      </span>
                    ) : (
                      <span className="inline-block rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Sin cotizar
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDefineTotal(order)}
                        className="stitch-button stitch-button-secondary px-2.5 py-1 text-xs"
                        title={hasTotal ? "Editar total aprobado" : "Definir cotización / total"}
                      >
                        <Icon name="edit" className="size-3.5" />
                        <span>{hasTotal ? "Editar total" : "Definir total"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRegisterPayment(order)}
                        disabled={!canPay}
                        className={`stitch-button px-2.5 py-1 text-xs ${
                          canPay
                            ? "stitch-button-primary"
                            : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                        title={
                          !hasTotal
                            ? "Debe definir el total de la orden primero"
                            : isPaid
                            ? "La orden ya está completamente pagada"
                            : "Registrar pago para esta orden"
                        }
                      >
                        <Icon name="payments" className="size-3.5" />
                        <span>Abonar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredSummaries.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm text-slate-500">
                  {search
                    ? "No se encontraron órdenes con el criterio de búsqueda especificado."
                    : "No hay órdenes para mostrar en esta sección."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
