"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Icon, type IconName } from "@/shared/components/icon";
import type { AdministrativeDashboard } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { getErrorMessage } from "@/shared/utils/error-message";
import { ClientDialog, emptyForm, type ClientForm } from "@/modules/clients/components/clients-view";
import { validateEmail, validatePersonName, validateSafeText } from "@/shared/utils/validation";
import { normalizeGuatemalaPhone, validateGuatemalaPhone } from "@/modules/clients/utils/phone";

export function AdministrativeDashboardView() {
  const [data, setData] = useState<AdministrativeDashboard | null>(null);
  const [error, setError] = useState("");
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyForm);
  const [clientError, setClientError] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  useEffect(() => { void apiRequest<AdministrativeDashboard>("/api/administrativo/dashboard").then(setData).catch((caught: unknown) => setError(getErrorMessage(caught))); }, []);
  const saveClient = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validatePersonName(clientForm.fullName, "Nombre completo")
      ?? validateSafeText(clientForm.identification, "Número de identificación")
      ?? validateGuatemalaPhone(clientForm.phone)
      ?? (clientForm.email ? validateEmail(clientForm.email) : null)
      ?? (clientForm.address ? validateSafeText(clientForm.address, "Dirección") : null);
    if (validationError) { setClientError(validationError); return; }
    setClientError("");
    setSavingClient(true);
    try {
      await apiRequest("/api/administrativo/clients", { method: "POST", body: JSON.stringify({ ...clientForm, phone: normalizeGuatemalaPhone(clientForm.phone) || null }) });
      setShowClientDialog(false);
      setClientForm(emptyForm);
      const refreshed = await apiRequest<AdministrativeDashboard>("/api/administrativo/dashboard");
      setData(refreshed);
    } catch (caught) { setClientError(getErrorMessage(caught)); }
    finally { setSavingClient(false); }
  };
  if (error) return <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando dashboard...</p>;
  const metrics: Array<{ label: string; value: number; icon: IconName; href: string }> = [
    { label: "Clientes", value: data.clients, icon: "handshake", href: "/administrativo/clientes" },
    { label: "Pendientes", value: data.orders.pending, icon: "history", href: "/administrativo/ordenes?status=PENDING" },
    { label: "En proceso", value: data.orders.in_progress, icon: "engineering", href: "/administrativo/ordenes?status=IN_PROGRESS" },
    { label: "Finalizadas", value: data.orders.completed, icon: "person_check", href: "/administrativo/ordenes?status=COMPLETED" },
    { label: "Sin asignar", value: data.orders.unassigned, icon: "person_off", href: "/administrativo/ordenes" }
  ];
  return <div className="mx-auto max-w-[1440px]"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-[28px] font-bold">Dashboard administrativo</h2><p className="mt-1 text-slate-600">Resumen operativo del taller.</p></div><div className="flex gap-2"><button type="button" className="stitch-button stitch-button-secondary" onClick={() => { setClientForm(emptyForm); setClientError(""); setShowClientDialog(true); }}>Nuevo cliente</button><Link className="stitch-button stitch-button-primary" href="/administrativo/ordenes/nueva">Nueva orden</Link></div></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => <Link key={metric.label} href={metric.href} aria-label={`${metric.label}: ${metric.value}`} className="stitch-card group flex flex-col justify-between p-4 transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"><div className="flex items-start justify-between"><Icon name={metric.icon} className="size-9 rounded-lg bg-blue-50 p-2 text-blue-700 transition-transform duration-200 group-hover:scale-110" /></div><div className="mt-3"><p className="text-sm font-medium text-slate-500 transition-colors group-hover:text-blue-900">{metric.label}</p><strong className="text-3xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">{metric.value}</strong></div></Link>)}</section><section className="stitch-card mt-6 overflow-hidden"><div className="border-b border-slate-200 p-4"><h3 className="font-semibold">Próximas fechas estimadas</h3></div><div className="overflow-x-auto"><table className="stitch-table"><thead><tr><th>Orden</th><th>Cliente</th><th>Servicio</th><th>Asignación</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{data.upcoming.map((order) => <tr key={order.id}><td><Link className="font-semibold text-blue-700" href={`/administrativo/ordenes/${order.id}`}>{order.code}</Link></td><td>{order.clientName}</td><td>{order.serviceType}</td><td>{order.assignedWorker ?? "Sin asignar"}</td><td><StatusBadge status={order.status} /></td><td>{order.estimatedDate ? new Intl.DateTimeFormat("es-GT").format(new Date(order.estimatedDate)) : "—"}</td></tr>)}{!data.upcoming.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay fechas próximas registradas.</td></tr>}</tbody></table></div></section>{showClientDialog && <ClientDialog form={clientForm} formError={clientError} isEditing={false} saving={savingClient} onClose={() => setShowClientDialog(false)} onSubmit={saveClient} setForm={setClientForm} />}</div>;
}
