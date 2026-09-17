"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dashboard } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";

const dateTime = (value: string) => new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function DashboardView() {
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState("");
  useEffect(() => { void apiRequest<Dashboard>("/api/admin/dashboard").then(setData).catch((caught: Error) => setError(caught.message)); }, []);
  if (error) return <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando resumen administrativo...</p>;
  const metrics = [
    { label: "Usuarios activos", value: data.users.active, icon: "group", color: "text-blue-700 bg-blue-50" },
    { label: "Usuarios inactivos", value: data.users.inactive, icon: "person_off", color: "text-slate-600 bg-slate-100" },
    { label: "Clientes registrados", value: data.clients, icon: "handshake", color: "text-blue-700 bg-blue-50" },
    { label: "Órdenes pendientes", value: data.orders.pending, icon: "engineering", color: "text-amber-700 bg-amber-50" }
  ];
  return <div className="mx-auto max-w-[1440px]">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><h2 className="text-[28px] font-bold tracking-tight">Panel de Control</h2><p className="mt-1 text-slate-600">Resumen general de las operaciones de reconstrucción y reparación de motores.</p></div><div className="flex flex-wrap gap-2"><Link className="stitch-button stitch-button-primary" href="/admin/users"><span className="material-symbols-outlined">person_add</span>Usuarios</Link><Link className="stitch-button stitch-button-secondary" href="/admin/clients">Clientes</Link><Link className="stitch-button stitch-button-secondary" href="/admin/work-orders">Órdenes</Link></div></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article className="stitch-card p-4" key={metric.label}><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{metric.label}</p><strong className="mt-2 block text-3xl">{metric.value}</strong></div><span className={`material-symbols-outlined rounded-lg p-2 ${metric.color}`}>{metric.icon}</span></div></article>)}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]"><div className="stitch-card overflow-hidden"><div className="border-b border-slate-300 p-4"><h3 className="font-semibold">Estado de órdenes de trabajo</h3><p className="mt-1 text-sm text-slate-500">Distribución actual obtenida del sistema.</p></div><div className="grid grid-cols-3 divide-x divide-slate-200"><Metric label="Pendientes" value={data.orders.pending} color="text-amber-700" /><Metric label="En proceso" value={data.orders.in_progress} color="text-blue-700" /><Metric label="Finalizadas" value={data.orders.completed} color="text-emerald-700" /></div><div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">Total de órdenes registradas: <strong>{data.orders.total}</strong></div></div><div className="stitch-card"><div className="border-b border-slate-300 p-4"><h3 className="font-semibold">Actividad reciente</h3></div>{data.recentActivity.length ? <ul className="divide-y divide-slate-200">{data.recentActivity.map((event) => <li className="flex gap-3 p-4" key={event.id}><span className="material-symbols-outlined rounded-full bg-blue-50 p-2 text-blue-700">history</span><div><p className="text-sm"><strong>{event.actorName ?? "Sistema"}</strong> · {event.action.replaceAll("_", " ")}</p><time className="text-xs text-slate-500">{dateTime(event.createdAt)}</time></div></li>)}</ul> : <p className="p-6 text-sm text-slate-500">No hay eventos de auditoría registrados todavía.</p>}</div></section>
  </div>;
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) { return <div className="p-5 text-center"><strong className={`text-3xl ${color}`}>{value}</strong><p className="mt-1 text-sm text-slate-500">{label}</p></div>; }
