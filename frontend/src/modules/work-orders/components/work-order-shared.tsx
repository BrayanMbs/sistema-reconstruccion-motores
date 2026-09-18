import type { ReactNode } from "react";
import { Icon } from "@/shared/components/icon";
import { PriorityBadge } from "@/shared/components/priority-badge";
import { ProgressBar } from "@/shared/components/progress-bar";
import { StatusBadge } from "@/shared/components/status-badge";
import type { WorkOrder } from "@/shared/models/admin";
export { getErrorMessage } from "@/shared/utils/error-message";

export function WorkOrderFilters({ search, status, onSearch, onStatus }: { search: string; status: string; onSearch: (value: string) => void; onStatus: (value: string) => void }) {
  return <section className="stitch-card mb-6 grid gap-4 p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
    <label className="text-sm text-slate-600"><span className="mb-2 block">Buscar orden</span><div className="relative"><Icon name="search" className="absolute left-3 top-2.5 text-slate-500" /><input className="stitch-input stitch-input-with-icon" placeholder="Orden, motor o cliente" value={search} onChange={(event) => onSearch(event.target.value)} /></div></label>
    <label className="text-sm text-slate-600"><span className="mb-2 block">Estado</span><select className="stitch-input" value={status} onChange={(event) => onStatus(event.target.value)}><option value="">Todos los estados</option><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLETED">Finalizada</option><option value="CANCELLED">Cancelada</option></select></label>
    <button type="button" className="stitch-button stitch-button-secondary" onClick={() => { onSearch(""); onStatus(""); }}><Icon name="filter" />Limpiar</button>
  </section>;
}

export function WorkOrderTable({ orders, total, action }: { orders: WorkOrder[]; total: number; action: (order: WorkOrder) => ReactNode }) {
  return <section className="stitch-card overflow-hidden"><div className="overflow-x-auto"><table className="stitch-table"><thead><tr><th>Orden</th><th>Cliente</th><th>Motor</th><th>Servicio</th><th>Prioridad</th><th>Estado</th><th>Avance</th><th>Fecha estimada</th><th className="text-right">Acciones</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="font-medium text-blue-700">{order.code}</td><td>{order.clientName}</td><td>{order.engineBrand} {order.engineModel}</td><td>{order.serviceType}</td><td><PriorityBadge priority={order.priority} /></td><td><StatusBadge status={order.status} /></td><td><ProgressBar value={order.progress} /></td><td className="text-slate-600">{order.estimatedDate ? formatDate(order.estimatedDate) : "—"}</td><td className="text-right">{action(order)}</td></tr>)}{!orders.length && <tr><td colSpan={9} className="p-10 text-center text-slate-500">No hay órdenes que coincidan con los filtros.</td></tr>}</tbody></table></div><div className="border-t border-slate-300 px-4 py-3 text-sm text-slate-600">Mostrando {orders.length} de {total} órdenes</div></section>;
}

export const formatDate = (value: string) => new Intl.DateTimeFormat("es-GT", { dateStyle: "short" }).format(new Date(value));
