"use client";

import { useCallback, useEffect, useState } from "react";
import type { Operator, WorkOrder } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";

export function OperatorsView() {
  const [operators, setOperators] = useState<Operator[]>([]); const [orders, setOrders] = useState<WorkOrder[]>([]); const [error, setError] = useState("");
  const load = useCallback(async () => { try { const [people, work] = await Promise.all([apiRequest<{ items: Operator[] }>("/api/admin/operators"), apiRequest<{ items: WorkOrder[] }>("/api/admin/work-orders?limit=100")]); setOperators(people.items); setOrders(work.items); } catch (caught) { setError((caught as Error).message); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="mx-auto max-w-[1440px]"><div className="mb-6"><h2 className="text-[28px] font-bold">Personal operativo</h2><p className="mt-1 text-slate-600">Vea la carga de trabajo de cada técnico y las órdenes que le han sido asignadas.</p></div>{error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{operators.map((operator) => { const assigned = orders.filter((order) => order.assignedWorkerId === operator.id); return <article className="stitch-card p-5" key={operator.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{operator.fullName}</h3><p className="mt-1 text-sm text-slate-500">{operator.email}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{operator.activeOrders} activas</span></div><div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Órdenes asignadas</p><ul className="mt-2 space-y-2">{assigned.length ? assigned.map((order) => <li key={order.id} className="flex justify-between gap-2 text-sm"><span className="font-medium text-blue-700">{order.code}</span><span className="truncate text-slate-600">{order.engineBrand} {order.engineModel}</span></li>) : <li className="text-sm text-slate-500">Sin órdenes asignadas.</li>}</ul></div></article>; })}{!operators.length && <p className="text-slate-500">No hay personal operativo activo. Cree usuarios con el rol “Trabajador Operativo”.</p>}</section>
    <p className="mt-6 text-sm text-slate-500">La asignación se realiza desde el detalle de cada orden de trabajo.</p></div>;
}
