"use client";

import type { ReactNode } from "react";
import { Icon } from "@/shared/components/icon";
import type { PaginatedReport, ReportSection, ReportsSummary, WorkOrderStatus } from "../models/reports";

const sections: { key: ReportSection; label: string }[] = [
  { key: "ORDERS", label: "Órdenes" }, { key: "CLIENTS", label: "Clientes" },
  { key: "INVENTORY", label: "Inventario" }, { key: "MOVEMENTS", label: "Movimientos" },
  { key: "FINANCE", label: "Finanzas" }
];

export function ReportTabs({ active, onChange }: { active: ReportSection; onChange: (section: ReportSection) => void }) {
  return <div role="tablist" aria-label="Categorías de reportes" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
    {sections.map((section) => <button key={section.key} type="button" role="tab" aria-selected={active === section.key} onClick={() => onChange(section.key)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${active === section.key ? "bg-blue-700 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>{section.label}</button>)}
  </div>;
}

export function DateStatusFields({ startDate = "", endDate = "", status = "", onChange }: { startDate?: string; endDate?: string; status?: string; onChange: (field: "startDate" | "endDate" | "status", value: string) => void }) {
  return <><Field label="Fecha inicial"><input aria-label="Fecha inicial" type="date" className="stitch-input" value={startDate} onChange={(event) => onChange("startDate", event.target.value)} /></Field><Field label="Fecha final"><input aria-label="Fecha final" type="date" className="stitch-input" value={endDate} onChange={(event) => onChange("endDate", event.target.value)} /></Field><Field label="Estado de orden"><select aria-label="Estado de orden" className="stitch-input" value={status} onChange={(event) => onChange("status", event.target.value)}><option value="">Todos</option><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLETED">Finalizada</option><option value="CANCELLED">Cancelada</option></select></Field></>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-600"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

export function SearchField({ value, onChange, placeholder = "Buscar..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <Field label="Búsqueda"><div className="relative"><Icon name="search" className="absolute left-3 top-2.5 text-slate-400" /><input aria-label="Búsqueda" className="stitch-input stitch-input-with-icon" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div></Field>;
}

export function FilterPanel({ children }: { children: ReactNode }) {
  return <section aria-label="Filtros del reporte" className="stitch-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">{children}</section>;
}

export function SummaryPanel({ data, loading, error, onRetry }: { data: ReportsSummary | null; loading: boolean; error: string; onRetry: () => void }) {
  if (loading) return <LoadingState label="Cargando resumen de reportes..." compact />;
  if (error || !data) return <ErrorState onRetry={onRetry} label="No fue posible cargar el resumen." />;
  const active = data.orders.PENDING + data.orders.IN_PROGRESS;
  const rate = data.assignments.total ? Math.round((data.assignments.assigned / data.assignments.total) * 100) : 0;
  const period = data.scope.startDate || data.scope.endDate ? `${data.scope.startDate ?? "inicio"} — ${data.scope.endDate ?? "hoy"}` : "Histórico completo";
  return <section aria-label="Resumen general" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold text-slate-900">Resumen general</h3><p className="text-xs text-slate-500">Período: {period}</p></div>{data.scope.status && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Estado: {data.scope.status}</span>}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Órdenes activas" value={active} tone="text-blue-700" /><Metric label="Órdenes finalizadas" value={data.orders.COMPLETED} tone="text-emerald-700" /><Metric label="Ingresos registrados" value={money(data.finance.total)} tone="text-emerald-700" /><Metric label="Cobertura asignada" value={`${rate}%`} tone="text-violet-700" /><Metric label="Stock bajo actual" value={data.inventory.low_stock} tone="text-amber-700" note={data.scope.inventoryIsCurrentState ? `Estado actual · ${data.inventory.total} artículos` : undefined} /></div>
    <div className="stitch-card grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">{(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as WorkOrderStatus[]).map((status) => <div key={status} className="flex justify-between gap-4 border-b border-slate-100 pb-2 lg:border-b-0 lg:border-r lg:pr-4 last:border-0"><span className="text-slate-600">{statusLabel(status)}</span><strong>{data.orders[status]}</strong></div>)}</div>
  </section>;
}

function Metric({ label, value, tone, note }: { label: string; value: string | number; tone: string; note?: string }) {
  return <article className="stitch-card p-5"><p className="text-sm text-slate-500">{label}</p><strong className={`mt-2 block text-3xl ${tone}`}>{value}</strong>{note && <p className="mt-2 text-xs text-slate-500">{note}</p>}</article>;
}

export function ResourceState({ loading, error, empty, onRetry, children }: { loading: boolean; error: string; empty: boolean; onRetry: () => void; children: ReactNode }) {
  if (loading) return <LoadingState label="Cargando resultados..." />;
  if (error) return <ErrorState onRetry={onRetry} label="No fue posible cargar este reporte." />;
  if (empty) return <div className="stitch-card p-10 text-center"><p className="font-semibold text-slate-700">No hay resultados para mostrar.</p><p className="mt-1 text-sm text-slate-500">Conservamos tus filtros para que puedas ajustarlos.</p></div>;
  return <>{children}</>;
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div role="status" className={`stitch-card flex items-center justify-center gap-3 text-sm text-slate-500 ${compact ? "h-28" : "h-64"}`}><Icon name="refresh" className="animate-spin text-blue-700" /><span>{label}</span></div>;
}

function ErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <div role="alert" className="stitch-card border-red-200 bg-red-50 p-6 text-center text-red-800"><p className="font-semibold">{label}</p><p className="mt-1 text-sm">Intenta nuevamente. Si el problema continúa, verifica tu conexión.</p><button type="button" className="stitch-button stitch-button-secondary mt-4" onClick={onRetry}><Icon name="refresh" />Reintentar</button></div>;
}

export function Pagination<T>({ data, onPage }: { data: PaginatedReport<T>; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>Mostrando {data.items.length} de {data.total} resultados</span><div className="flex items-center gap-2"><button type="button" className="stitch-button stitch-button-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Anterior</button><span aria-live="polite" className="min-w-20 text-center font-semibold">{data.page} / {pages}</span><button type="button" className="stitch-button stitch-button-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={data.page >= pages} onClick={() => onPage(data.page + 1)}>Siguiente</button></div></div>;
}

export const money = (value: number) => `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-GT", { dateStyle: "short" }).format(new Date(value)) : "—";
const statusLabel = (status: WorkOrderStatus) => ({ PENDING: "Pendientes", IN_PROGRESS: "En proceso", COMPLETED: "Finalizadas", CANCELLED: "Canceladas" })[status];

