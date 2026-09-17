"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { OperatorNotification } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";

export function OperationalNotificationsView() {
  const [items, setItems] = useState<OperatorNotification[] | null>(null); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setItems((await apiRequest<{ items: OperatorNotification[] }>("/api/operativo/notifications")).items); } catch (caught) { setError((caught as Error).message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const read = async (id: string) => { try { await apiRequest(`/api/operativo/notifications/${id}/read`, { method: "PATCH" }); await load(); } catch (caught) { setError((caught as Error).message); } };
  return <div className="mx-auto max-w-4xl"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inicio / Notificaciones</p><h1 className="mt-2 text-3xl font-bold">Notificaciones</h1><p className="mt-1 text-slate-600">Cambios relevantes de las órdenes que tienes asignadas.</p>{error && <p role="alert" className="mt-5 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}<section className="stitch-card mt-6 divide-y divide-slate-200">{items === null ? <p className="p-6 text-slate-500">Cargando notificaciones...</p> : <>{items.map((item) => <article className={`flex flex-wrap items-center justify-between gap-4 p-5 ${item.readAt ? "" : "bg-blue-50/50"}`} key={item.id}><div><div className="flex items-center gap-2"><strong>{item.type === "ORDER_ASSIGNED" ? "Nueva orden asignada" : item.type}</strong>{!item.readAt && <span className="size-2 rounded-full bg-blue-600" />}</div><p className="mt-1 text-sm text-slate-600">{item.message}</p><time className="mt-2 block text-xs text-slate-500">{dateTime(item.createdAt)}</time></div><div className="flex gap-2">{item.workOrderId && <Link className="stitch-button stitch-button-secondary" href={`/operativo/ordenes/${item.workOrderId}`}>Abrir orden</Link>}{!item.readAt && <button className="stitch-button stitch-button-primary" onClick={() => void read(item.id)}>Marcar leída</button>}</div></article>)}{!items.length && <p className="p-8 text-center text-slate-500">No tienes notificaciones.</p>}</>}</section></div>;
}
const dateTime = (value: string) => new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
