"use client";

import { useState } from "react";
import type {
  ClientReportFilters, FinanceReportFilters, InventoryReportFilters, MovementReportFilters,
  OrderReportFilters, SummaryFilters
} from "../dtos/reports.dto";
import { useDebouncedValue, useReportResource } from "../hooks/use-reports";
import type { ReportSection, WorkOrderStatus } from "../models/reports";
import { reportsService } from "../services/reports.service";
import { ClientsTable, FinanceTable, InventoryTable, MovementsTable, OrdersTable } from "./report-tables";
import { ExportCsvButton } from "./export-csv-button";
import {
  DateStatusFields, Field, FilterPanel, Pagination, ReportTabs, ResourceState, SearchField, SummaryPanel
} from "./report-ui";

const pageDefaults = { page: 1, limit: 20 };

export function ReportsView() {
  const [active, setActive] = useState<ReportSection>("ORDERS");
  const [summaryFilters, setSummaryFilters] = useState<SummaryFilters>({});
  const [orderFilters, setOrderFilters] = useState<OrderReportFilters>({ ...pageDefaults, search: "" });
  const [clientFilters, setClientFilters] = useState<ClientReportFilters>({ ...pageDefaults, search: "" });
  const [inventoryFilters, setInventoryFilters] = useState<InventoryReportFilters>({ ...pageDefaults, search: "", category: "" });
  const [movementFilters, setMovementFilters] = useState<MovementReportFilters>({ ...pageDefaults, reason: "", itemId: "", responsibleUserId: "", workOrderId: "" });
  const [financeFilters, setFinanceFilters] = useState<FinanceReportFilters>({ ...pageDefaults, search: "", method: "" });

  const orderSearch = useDebouncedValue(orderFilters.search);
  const clientSearch = useDebouncedValue(clientFilters.search);
  const inventorySearch = useDebouncedValue(inventoryFilters.search);
  const inventoryCategory = useDebouncedValue(inventoryFilters.category);
  const movementReason = useDebouncedValue(movementFilters.reason);
  const movementItem = useDebouncedValue(movementFilters.itemId);
  const movementResponsible = useDebouncedValue(movementFilters.responsibleUserId);
  const movementOrder = useDebouncedValue(movementFilters.workOrderId);
  const financeSearch = useDebouncedValue(financeFilters.search);
  const financeMethod = useDebouncedValue(financeFilters.method);

  const appliedOrders = { ...orderFilters, search: orderSearch };
  const appliedClients = { ...clientFilters, search: clientSearch };
  const appliedInventory = { ...inventoryFilters, search: inventorySearch, category: inventoryCategory };
  const appliedMovements = { ...movementFilters, reason: movementReason, itemId: movementItem, responsibleUserId: movementResponsible, workOrderId: movementOrder };
  const appliedFinance = { ...financeFilters, search: financeSearch, method: financeMethod };

  const summary = useReportResource(JSON.stringify(summaryFilters), () => reportsService.summary(summaryFilters));
  const orders = useReportResource(active === "ORDERS" ? JSON.stringify(appliedOrders) : null, () => reportsService.orders(appliedOrders));
  const clients = useReportResource(active === "CLIENTS" ? JSON.stringify(appliedClients) : null, () => reportsService.clients(appliedClients));
  const inventory = useReportResource(active === "INVENTORY" ? JSON.stringify(appliedInventory) : null, () => reportsService.inventory(appliedInventory));
  const movements = useReportResource(active === "MOVEMENTS" ? JSON.stringify(appliedMovements) : null, () => reportsService.movements(appliedMovements));
  const finance = useReportResource(active === "FINANCE" ? JSON.stringify(appliedFinance) : null, () => reportsService.finance(appliedFinance));

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <header className="border-b border-slate-200 pb-5"><h2 className="text-[28px] font-bold tracking-tight text-slate-900">Reportes</h2><p className="mt-1 text-sm text-slate-600">Consulta indicadores y datos operativos reales por período, estado y categoría.</p></header>

    <FilterPanel><DateStatusFields startDate={summaryFilters.startDate} endDate={summaryFilters.endDate} status={summaryFilters.status} onChange={(field, value) => setSummaryFilters((current) => ({ ...current, [field]: value as WorkOrderStatus | "" }))} /></FilterPanel>
    <SummaryPanel {...summary} onRetry={summary.retry} />

    <section className="space-y-4"><div><h3 className="text-lg font-bold text-slate-900">Detalle de reportes</h3><p className="text-xs text-slate-500">Cada categoría se consulta únicamente al seleccionarla.</p></div><ReportTabs active={active} onChange={setActive} />
      {active === "ORDERS" && <><FilterPanel><SearchField value={orderFilters.search ?? ""} onChange={(search) => setOrderFilters((current) => ({ ...current, search, page: 1 }))} placeholder="Orden, cliente o motor" /><DateStatusFields startDate={orderFilters.startDate} endDate={orderFilters.endDate} status={orderFilters.status} onChange={(field, value) => setOrderFilters((current) => ({ ...current, [field]: value, page: 1 }))} /></FilterPanel><div className="flex justify-end"><ExportCsvButton type="orders" filters={orderFilters} /></div><ReportResult resource={orders} render={(data) => <OrdersTable items={data.items} />} onPage={(page) => setOrderFilters((current) => ({ ...current, page }))} /></>}
      {active === "CLIENTS" && <><FilterPanel><SearchField value={clientFilters.search ?? ""} onChange={(search) => setClientFilters((current) => ({ ...current, search, page: 1 }))} placeholder="Nombre, identificación o correo" /><DateStatusFields startDate={clientFilters.startDate} endDate={clientFilters.endDate} status={clientFilters.status} onChange={(field, value) => setClientFilters((current) => ({ ...current, [field]: value, page: 1 }))} /></FilterPanel><div className="flex justify-end"><ExportCsvButton type="clients" filters={clientFilters} /></div><ReportResult resource={clients} render={(data) => <ClientsTable items={data.items} />} onPage={(page) => setClientFilters((current) => ({ ...current, page }))} /></>}
      {active === "INVENTORY" && <><FilterPanel><SearchField value={inventoryFilters.search ?? ""} onChange={(search) => setInventoryFilters((current) => ({ ...current, search, page: 1 }))} placeholder="Código o artículo" /><Field label="Tipo"><select aria-label="Tipo" className="stitch-input" value={inventoryFilters.type ?? ""} onChange={(event) => setInventoryFilters((current) => ({ ...current, type: event.target.value as InventoryReportFilters["type"], page: 1 }))}><option value="">Todos</option><option value="PART">Repuesto</option><option value="MATERIAL">Material</option><option value="TOOL">Herramienta</option><option value="CONSUMABLE">Consumible</option></select></Field><Field label="Categoría"><input aria-label="Categoría" className="stitch-input" value={inventoryFilters.category ?? ""} onChange={(event) => setInventoryFilters((current) => ({ ...current, category: event.target.value, page: 1 }))} /></Field><Field label="Estado"><select aria-label="Estado de inventario" className="stitch-input" value={inventoryFilters.status ?? ""} onChange={(event) => setInventoryFilters((current) => ({ ...current, status: event.target.value as InventoryReportFilters["status"], page: 1 }))}><option value="">Todos</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="LOW">Stock bajo</option><option value="OUT">Agotado</option></select></Field></FilterPanel><div className="flex justify-end"><ExportCsvButton type="inventory" filters={inventoryFilters} /></div><ReportResult resource={inventory} render={(data) => <InventoryTable items={data.items} />} onPage={(page) => setInventoryFilters((current) => ({ ...current, page }))} /></>}
      {active === "MOVEMENTS" && <><FilterPanel><DateFields startDate={movementFilters.startDate} endDate={movementFilters.endDate} onChange={(field, value) => setMovementFilters((current) => ({ ...current, [field]: value, page: 1 }))} /><Field label="Tipo de movimiento"><select aria-label="Tipo de movimiento" className="stitch-input" value={movementFilters.movementType ?? ""} onChange={(event) => setMovementFilters((current) => ({ ...current, movementType: event.target.value as MovementReportFilters["movementType"], page: 1 }))}><option value="">Todos</option><option value="ENTRY">Entrada</option><option value="EXIT">Salida</option><option value="ADJUSTMENT">Ajuste</option></select></Field><Field label="Motivo"><input aria-label="Motivo" className="stitch-input" value={movementFilters.reason ?? ""} onChange={(event) => setMovementFilters((current) => ({ ...current, reason: event.target.value, page: 1 }))} /></Field><Field label="ID de producto"><input aria-label="ID de producto" className="stitch-input" value={movementFilters.itemId ?? ""} onChange={(event) => setMovementFilters((current) => ({ ...current, itemId: event.target.value, page: 1 }))} /></Field><Field label="ID de responsable"><input aria-label="ID de responsable" className="stitch-input" value={movementFilters.responsibleUserId ?? ""} onChange={(event) => setMovementFilters((current) => ({ ...current, responsibleUserId: event.target.value, page: 1 }))} /></Field><Field label="ID de orden"><input aria-label="ID de orden" className="stitch-input" value={movementFilters.workOrderId ?? ""} onChange={(event) => setMovementFilters((current) => ({ ...current, workOrderId: event.target.value, page: 1 }))} /></Field></FilterPanel><div className="flex justify-end"><ExportCsvButton type="inventory-movements" filters={movementFilters} /></div><ReportResult resource={movements} render={(data) => <MovementsTable items={data.items} />} onPage={(page) => setMovementFilters((current) => ({ ...current, page }))} /></>}
      {active === "FINANCE" && <><FilterPanel><SearchField value={financeFilters.search ?? ""} onChange={(search) => setFinanceFilters((current) => ({ ...current, search, page: 1 }))} placeholder="Orden, cliente o referencia" /><DateStatusFields startDate={financeFilters.startDate} endDate={financeFilters.endDate} status={financeFilters.status} onChange={(field, value) => setFinanceFilters((current) => ({ ...current, [field]: value, page: 1 }))} /><Field label="Método"><input aria-label="Método" className="stitch-input" value={financeFilters.method ?? ""} onChange={(event) => setFinanceFilters((current) => ({ ...current, method: event.target.value, page: 1 }))} /></Field></FilterPanel><div className="flex justify-end"><ExportCsvButton type="finance" filters={financeFilters} /></div><ReportResult resource={finance} render={(data) => <FinanceTable items={data.items} />} onPage={(page) => setFinanceFilters((current) => ({ ...current, page }))} /></>}
    </section>
  </div>;
}

type Resource<T> = { data: { items: T[]; total: number; page: number; limit: number } | null; loading: boolean; error: string; retry: () => void };
function ReportResult<T>({ resource, render, onPage }: { resource: Resource<T>; render: (data: NonNullable<Resource<T>["data"]>) => React.ReactNode; onPage: (page: number) => void }) {
  return <ResourceState loading={resource.loading} error={resource.error} empty={Boolean(resource.data && resource.data.items.length === 0)} onRetry={resource.retry}>{resource.data && <section className="stitch-card overflow-hidden">{render(resource.data)}<Pagination data={resource.data} onPage={onPage} /></section>}</ResourceState>;
}

function DateFields({ startDate = "", endDate = "", onChange }: { startDate?: string; endDate?: string; onChange: (field: "startDate" | "endDate", value: string) => void }) {
  return <><Field label="Fecha inicial"><input aria-label="Fecha inicial" type="date" className="stitch-input" value={startDate} onChange={(event) => onChange("startDate", event.target.value)} /></Field><Field label="Fecha final"><input aria-label="Fecha final" type="date" className="stitch-input" value={endDate} onChange={(event) => onChange("endDate", event.target.value)} /></Field></>;
}
