import type { InventoryItem, InventoryMovement } from "../models/domain";
import type { ReportClientRow, ReportFinanceRow, ReportOrderRow } from "../dtos/reports.dtos";
import type { ReportExportType } from "../dtos/reports.dtos";

type CsvValue = string | number | boolean | null | undefined;
type CsvColumn<T> = { header: string; value: (row: T) => CsvValue };

const formulaPrefix = /^[\t\r=+\-@]/;
export const sanitizeCsvCell = (value: CsvValue): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return typeof value === "string" && formulaPrefix.test(text) ? `'${text}` : text;
};

export const escapeCsvCell = (value: CsvValue): string => `"${sanitizeCsvCell(value).replaceAll('"', '""').replaceAll("\r\n", "\n").replaceAll("\r", "\n")}"`;
const guatemalaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});
const dateParts = (value: Date) => Object.fromEntries(guatemalaDate.formatToParts(value).map((part) => [part.type, part.value]));
const readableDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const parts = dateParts(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};
export const reportFileDate = (value = new Date()): string => {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const orderColumns: CsvColumn<ReportOrderRow>[] = [
  { header: "Orden", value: (row) => row.code }, { header: "Cliente", value: (row) => row.clientName },
  { header: "Marca de motor", value: (row) => row.engineBrand }, { header: "Modelo de motor", value: (row) => row.engineModel },
  { header: "Servicio", value: (row) => row.serviceType }, { header: "Estado", value: (row) => row.status },
  { header: "Avance", value: (row) => row.progress }, { header: "Prioridad", value: (row) => row.priority },
  { header: "Asignado a", value: (row) => row.assignedWorker }, { header: "Total aprobado", value: (row) => row.totalAmount },
  { header: "Total pagado", value: (row) => row.totalPaid }, { header: "Saldo", value: (row) => row.balance },
  { header: "Estado financiero", value: (row) => row.financialStatus }, { header: "Fecha de creación", value: (row) => readableDate(row.createdAt) }
];
const clientColumns: CsvColumn<ReportClientRow>[] = [
  { header: "Cliente", value: (row) => row.fullName }, { header: "Tipo de identificación", value: (row) => row.identificationType },
  { header: "Identificación", value: (row) => row.identification }, { header: "Teléfono", value: (row) => row.phone },
  { header: "Correo", value: (row) => row.email }, { header: "Órdenes", value: (row) => row.orderCount },
  { header: "Pendientes", value: (row) => row.pendingOrders }, { header: "En proceso", value: (row) => row.inProgressOrders },
  { header: "Finalizadas", value: (row) => row.completedOrders }, { header: "Canceladas", value: (row) => row.cancelledOrders },
  { header: "Última orden", value: (row) => readableDate(row.lastOrderAt) }, { header: "Fecha de registro", value: (row) => readableDate(row.createdAt) }
];
const inventoryColumns: CsvColumn<InventoryItem>[] = [
  { header: "Código", value: (row) => row.sku }, { header: "Artículo", value: (row) => row.name },
  { header: "Tipo", value: (row) => row.type }, { header: "Categoría", value: (row) => row.category },
  { header: "Marca", value: (row) => row.brand }, { header: "Unidad", value: (row) => row.unit },
  { header: "Stock actual", value: (row) => row.stockQuantity }, { header: "Stock mínimo", value: (row) => row.minimumStock },
  { header: "Activo", value: (row) => row.isActive ? "Sí" : "No" }, { header: "Ubicación", value: (row) => row.location }
];
const movementColumns: CsvColumn<InventoryMovement>[] = [
  { header: "Fecha", value: (row) => readableDate(row.createdAt) }, { header: "Código", value: (row) => row.itemCode },
  { header: "Artículo", value: (row) => row.itemName }, { header: "Movimiento", value: (row) => row.movementType },
  { header: "Cantidad", value: (row) => row.quantity }, { header: "Stock anterior", value: (row) => row.previousStock },
  { header: "Stock resultante", value: (row) => row.resultingStock }, { header: "Motivo", value: (row) => row.reason },
  { header: "Responsable", value: (row) => row.performedByName }, { header: "Orden", value: (row) => row.workOrderCode },
  { header: "Documento", value: (row) => row.referenceDocument }, { header: "Observación", value: (row) => row.observation }
];
const financeColumns: CsvColumn<ReportFinanceRow>[] = [
  { header: "Fecha", value: (row) => readableDate(row.createdAt) }, { header: "Orden", value: (row) => row.workOrderCode },
  { header: "Cliente", value: (row) => row.clientName }, { header: "Monto", value: (row) => row.amount },
  { header: "Método", value: (row) => row.method }, { header: "Referencia", value: (row) => row.reference },
  { header: "Recibido por", value: (row) => row.receivedBy }
];

const csv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const lines = [columns.map((column) => escapeCsvCell(column.header)).join(",")];
  rows.forEach((row) => lines.push(columns.map((column) => escapeCsvCell(column.value(row))).join(",")));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

export const buildReportCsv = (type: ReportExportType, rows: unknown[]): string => {
  switch (type) {
    case "orders": return csv(rows as ReportOrderRow[], orderColumns);
    case "clients": return csv(rows as ReportClientRow[], clientColumns);
    case "inventory": return csv(rows as InventoryItem[], inventoryColumns);
    case "inventory-movements": return csv(rows as InventoryMovement[], movementColumns);
    case "finance": return csv(rows as ReportFinanceRow[], financeColumns);
  }
};

export const exportFileNames: Record<ReportExportType, string> = {
  orders: "ordenes", clients: "clientes", inventory: "inventario",
  "inventory-movements": "movimientos-inventario", finance: "finanzas"
};

