"use client";

import { useEffect, useState } from "react";
import type { ReportsSummary } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";

export function ReportsView() {
  const [report, setReport] = useState<ReportsSummary | null>(null); const [error, setError] = useState("");
  useEffect(() => { void apiRequest<{ report: ReportsSummary }>("/api/admin/reports/summary").then((result) => setReport(result.report)).catch((caught: Error) => setError(caught.message)); }, []);
  const completed = report?.orders.COMPLETED ?? 0; const active = (report?.orders.PENDING ?? 0) + (report?.orders.IN_PROGRESS ?? 0); const assignmentRate = report?.assignments.total ? Math.round((report.assignments.assigned / report.assignments.total) * 100) : 0;
  return <div className="mx-auto max-w-[1200px]"><div className="mb-6"><h2 className="text-[28px] font-bold">Reportes</h2><p className="mt-1 text-slate-600">Resumen operativo, inventario y cobros registrados en el sistema.</p></div>{error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Órdenes activas" value={active} tone="text-blue-700" /><Metric label="Órdenes finalizadas" value={completed} tone="text-emerald-700" /><Metric label="Ingresos registrados" value={`Q ${(report?.finance.total ?? 0).toFixed(2)}`} tone="text-emerald-700" /><Metric label="Cobertura de asignación" value={`${assignmentRate}%`} tone="text-violet-700" /></section>
    <section className="mt-6 grid gap-5 lg:grid-cols-2"><article className="stitch-card p-5"><h3 className="font-bold">Estado de órdenes</h3><dl className="mt-4 space-y-3 text-sm">{[["Pendientes", report?.orders.PENDING ?? 0], ["En proceso", report?.orders.IN_PROGRESS ?? 0], ["Finalizadas", completed], ["Canceladas", report?.orders.CANCELLED ?? 0]].map(([label, value]) => <div className="flex justify-between border-b border-slate-100 pb-2" key={String(label)}><dt className="text-slate-600">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl></article><article className="stitch-card p-5"><h3 className="font-bold">Alertas de inventario</h3><p className="mt-4 text-4xl font-bold text-amber-700">{report?.inventory.low_stock ?? 0}</p><p className="mt-1 text-sm text-slate-600">artículos en o por debajo del nivel mínimo, de {report?.inventory.total ?? 0} registrados.</p><h3 className="mt-6 font-bold">Pagos</h3><p className="mt-2 text-sm text-slate-600">{report?.finance.payments ?? 0} movimientos registrados.</p></article></section></div>;
}
function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) { return <article className="stitch-card p-5"><p className="text-sm text-slate-500">{label}</p><strong className={`mt-2 block text-3xl ${tone}`}>{value}</strong></article>; }
