"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dashboard } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { Icon, type IconName } from "@/shared/components/icon";
import { formatAuditDateTime, getAuditActionInfo } from "@/modules/audit/utils/audit-helpers";

export function DashboardView() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiRequest<Dashboard>("/api/admin/dashboard")
      .then(setData)
      .catch((caught: Error) => setError(caught.message));
  }, []);

  if (error) {
    return <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  }

  if (!data) {
    return <p className="text-slate-500">Cargando resumen administrativo...</p>;
  }

  const metrics: {
    label: string;
    value: number;
    icon: IconName;
    color: string;
    href: string;
  }[] = [
    {
      label: "Usuarios activos",
      value: data.users.active,
      icon: "group",
      color: "text-blue-700 bg-blue-50 group-hover:bg-blue-100/80",
      href: "/admin/users?active=true"
    },
    {
      label: "Usuarios inactivos",
      value: data.users.inactive,
      icon: "person_off",
      color: "text-slate-600 bg-slate-100 group-hover:bg-slate-200/80",
      href: "/admin/users?active=false"
    },
    {
      label: "Clientes registrados",
      value: data.clients,
      icon: "handshake",
      color: "text-blue-700 bg-blue-50 group-hover:bg-blue-100/80",
      href: "/admin/clients"
    },
    {
      label: "Órdenes pendientes",
      value: data.orders.pending,
      icon: "engineering",
      color: "text-amber-700 bg-amber-50 group-hover:bg-amber-100/80",
      href: "/admin/work-orders?status=PENDING"
    }
  ];

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight">Panel de Control</h2>
          <p className="mt-1 text-slate-600">Resumen general de las operaciones de reconstrucción y reparación de motores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="stitch-button stitch-button-primary" href="/admin/users">
            <Icon name="person_add" />
            Usuarios
          </Link>
          <Link className="stitch-button stitch-button-secondary" href="/admin/clients">
            Clientes
          </Link>
          <Link className="stitch-button stitch-button-secondary" href="/admin/work-orders">
            Órdenes
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            aria-label={`${metric.label}: ${metric.value}`}
            className="stitch-card group flex flex-col justify-between p-4 transition-colors duration-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 transition-colors group-hover:text-blue-900">{metric.label}</p>
                <strong className="mt-2 block text-3xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">{metric.value}</strong>
              </div>
              <Icon name={metric.icon} className={`size-10 rounded-lg p-2 transition-all duration-200 group-hover:scale-110 ${metric.color}`} />
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="stitch-card overflow-hidden">
          <div className="border-b border-slate-300 p-4">
            <h3 className="font-semibold text-slate-900">Estado de órdenes de trabajo</h3>
            <p className="mt-1 text-sm text-slate-500">Distribución actual obtenida del sistema.</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <MetricLink
              label="Pendientes"
              value={data.orders.pending}
              color="text-amber-700"
              href="/admin/work-orders?status=PENDING"
              hoverBg="hover:bg-amber-50/70"
            />
            <MetricLink
              label="En proceso"
              value={data.orders.in_progress}
              color="text-blue-700"
              href="/admin/work-orders?status=IN_PROGRESS"
              hoverBg="hover:bg-blue-50/70"
            />
            <MetricLink
              label="Finalizadas"
              value={data.orders.completed}
              color="text-emerald-700"
              href="/admin/work-orders?status=COMPLETED"
              hoverBg="hover:bg-emerald-50/70"
            />
          </div>
          <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            Total de órdenes registradas: <strong>{data.orders.total}</strong>
          </div>
        </div>

        <div className="stitch-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-300 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Icon name="history" className="size-4.5 text-blue-700" />
              <h3 className="font-semibold text-slate-900">Actividad reciente</h3>
            </div>
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              Ver auditoría completa
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {data.recentActivity.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((event) => {
                const info = getAuditActionInfo(event.action);
                return (
                  <li
                    className="group flex items-start gap-3.5 p-4 transition-colors hover:bg-slate-50/70"
                    key={event.id}
                  >
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${info.iconColor}`}>
                      <Icon name={info.icon} className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">
                          {info.label}
                        </p>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${info.badgeColor}`}>
                          {info.category}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <span className="font-normal text-slate-400">Por</span>
                          {event.actorName ?? "Sistema"}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <time dateTime={event.createdAt} className="text-slate-500">
                          {formatAuditDateTime(event.createdAt)}
                        </time>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Icon name="history" className="mx-auto mb-2 size-8 text-slate-300" />
              <p className="text-sm">No hay eventos de auditoría registrados todavía.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricLink({
  label,
  value,
  color,
  href,
  hoverBg
}: {
  label: string;
  value: number;
  color: string;
  href: string;
  hoverBg: string;
}) {
  return (
    <Link
      href={href}
      className={`group block p-5 text-center transition-all duration-200 ${hoverBg} focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset`}
      title={`Ver órdenes: ${label}`}
    >
      <strong className={`inline-block text-3xl font-bold transition-transform duration-200 group-hover:scale-110 ${color}`}>
        {value}
      </strong>
      <p className="mt-1 text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-900">{label}</p>
      <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors group-hover:text-blue-700">
        Ver órdenes <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
      </span>
    </Link>
  );
}
