"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/shared/components/icon";
import type { AdministrativeDashboard } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { getErrorMessage } from "@/shared/utils/error-message";

export function AdministrativeDashboardView() {
  const [data, setData] = useState<AdministrativeDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void apiRequest<AdministrativeDashboard>("/api/administrativo/dashboard").then(setData).catch((caught: unknown) => setError(getErrorMessage(caught))); }, []);
  if (error) return <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando dashboard...</p>;
  const metrics: Array<[string, number, IconName]> = [["Clientes", data.clients, "handshake"], ["Pendientes", data.orders.pending, "history"], ["En proceso", data.orders.in_progress, "engineering"], ["Finalizadas", data.orders.completed, "person_check"], ["Sin asignar", data.orders.unassigned, "person_off"]];
  return <div className="mx-auto max-w-[1440px]"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-[28px] font-bold">Dashboard administrativo</h2><p className="mt-1 text-slate-600">Resumen operativo del taller.</p></div><div className="flex gap-2"><Link className="stitch-button stitch-button-secondary" href="/administrativo/clientes">Nuevo cliente</Link><Link className="stitch-button stitch-button-primary" href="/administrativo/ordenes/nueva">Nueva orden</Link></div></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, icon]) => <article className="stitch-card p-4" key={label}><Icon name={icon} className="size-9 rounded-lg bg-blue-50 p-2 text-blue-700" /><p className="mt-3 text-sm text-slate-500">{label}</p><strong className="text-3xl">{value}</strong></article>)}</section><section className="stitch-card mt-6 overflow-hidden"><div className="border-b border-slate-200 p-4"><h3 className="font-semibold">Próximas fechas estimadas</h3></div><div className="overflow-x-auto"><table className="stitch-table"><thead><tr><th>Orden</th><th>Cliente</th><th>Servicio</th><th>Asignación</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{data.upcoming.map((order) => <tr key={order.id}><td><Link className="font-semibold text-blue-700" href={`/administrativo/ordenes/${order.id}`}>{order.code}</Link></td><td>{order.clientName}</td><td>{order.serviceType}</td><td>{order.assignedWorker ?? "Sin asignar"}</td><td><StatusBadge status={order.status} /></td><td>{order.estimatedDate ? new Intl.DateTimeFormat("es-GT").format(new Date(order.estimatedDate)) : "—"}</td></tr>)}{!data.upcoming.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay fechas próximas registradas.</td></tr>}</tbody></table></div></section></div>;
}
