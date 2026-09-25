"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/shared/components/icon";
import type { OrderTimelineEvent } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";

export function OrderTimeline({ endpoint, refreshKey = 0 }: { endpoint: string; refreshKey?: number }) {
  const [items, setItems] = useState<OrderTimelineEvent[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError(""); setItems(null);
    try { setItems((await apiRequest<{ items: OrderTimelineEvent[] }>(endpoint)).items); }
    catch { setError("No fue posible cargar el historial de la orden."); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  return <section className="stitch-card mt-5 p-6" aria-labelledby="order-timeline-title"><div className="flex items-center gap-2"><Icon name="history" /><h2 id="order-timeline-title" className="text-lg font-bold">Historial de la orden</h2></div>{items === null && !error && <div className="mt-5 space-y-3" aria-label="Cargando historial"><div className="h-12 animate-pulse rounded bg-slate-100" /><div className="h-12 animate-pulse rounded bg-slate-100" /></div>}{error && <div className="mt-4"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" className="stitch-button stitch-button-secondary mt-3" onClick={() => void load()}><Icon name="refresh" />Reintentar</button></div>}{items?.length === 0 && <p className="mt-4 text-sm text-slate-500">No hay actividad registrada para esta orden.</p>}{items && items.length > 0 && <ol className="mt-5 space-y-5">{items.map((event) => <li key={event.id} className="relative border-l-2 border-blue-200 pl-5"><span className="absolute -left-[7px] top-1 size-3 rounded-full border-2 border-blue-700 bg-white" aria-hidden="true" /><article><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{event.title}</h3><time className="text-xs text-slate-500" dateTime={event.occurredAt}>{dateTime(event.occurredAt)}</time></div>{event.description && <p className="mt-1 text-sm text-slate-600">{event.description}</p>}{event.actor && <p className="mt-1 text-xs text-slate-500">Registrado por {event.actor.name}</p>}{event.progress !== null && <p className="mt-1 text-sm font-medium text-blue-700">Avance: {event.progress}%</p>}</article></li>)}</ol>}</section>;
}

const dateTime = (value: string) => new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
