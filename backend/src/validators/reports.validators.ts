import type {
  ReportClientFilters,
  ReportFinanceFilters,
  ReportInventoryFilters,
  ReportInventoryMovementFilters,
  ReportOrderFilters,
  ReportSummaryFilters,
  ReportExportFilters,
  ReportExportType
} from "../dtos/reports.dtos";
import { reportExportTypes } from "../dtos/reports.dtos";
import type { WorkOrderStatus } from "../models/domain";
import { AppError } from "../utils/app-error";
import { inventoryListFilters, inventoryMovementFilters } from "./inventory.validators";
import { limitFromQuery, optionalDate, optionalText, pageFromQuery } from "./common.validators";

const orderStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const reportDateRange = (query: Record<string, unknown>) => {
  const startDate = optionalDate(query.startDate, "Fecha inicial") ?? undefined;
  const endDate = optionalDate(query.endDate, "Fecha final") ?? undefined;
  if (startDate && endDate && startDate > endDate) {
    throw new AppError("La fecha inicial no puede ser posterior a la fecha final", 422, "INVALID_DATE_RANGE");
  }
  return { startDate, endDate };
};

const reportStatus = (value: unknown): WorkOrderStatus | undefined => {
  const status = optionalText(value, "Estado", 24);
  if (!status) return undefined;
  if (!orderStatuses.includes(status as WorkOrderStatus)) {
    throw new AppError("Estado de orden no válido", 422, "INVALID_REPORT_STATUS");
  }
  return status as WorkOrderStatus;
};

const reportPagination = (query: Record<string, unknown>) => {
  for (const [key, label] of [["page", "Página"], ["limit", "Límite"]] as const) {
    const value = query[key];
    if (value !== undefined && (!/^[1-9]\d*$/.test(String(value)))) {
      throw new AppError(`${label} debe ser un entero mayor que cero`, 422, "INVALID_PAGINATION");
    }
  }
  return { page: pageFromQuery(query.page), limit: limitFromQuery(query.limit) };
};

export const reportSummaryFilters = (query: Record<string, unknown>): ReportSummaryFilters => ({
  ...reportDateRange(query), status: reportStatus(query.status)
});

export const reportOrderFilters = (query: Record<string, unknown>): ReportOrderFilters => ({
  ...reportDateRange(query), ...reportPagination(query),
  search: optionalText(query.search, "Búsqueda", 180) ?? undefined,
  status: reportStatus(query.status)
});

export const reportClientFilters = (query: Record<string, unknown>): ReportClientFilters => ({
  ...reportDateRange(query), ...reportPagination(query),
  search: optionalText(query.search, "Búsqueda", 180) ?? undefined,
  status: reportStatus(query.status)
});

export const reportInventoryFilters = (query: Record<string, unknown>): ReportInventoryFilters => ({
  ...inventoryListFilters(query), ...reportPagination(query)
});

export const reportInventoryMovementFilters = (query: Record<string, unknown>): ReportInventoryMovementFilters => ({
  ...inventoryMovementFilters(query), ...reportDateRange(query), ...reportPagination(query)
});

export const reportFinanceFilters = (query: Record<string, unknown>): ReportFinanceFilters => ({
  ...reportDateRange(query), ...reportPagination(query),
  search: optionalText(query.search, "Búsqueda", 180) ?? undefined,
  method: optionalText(query.method, "Método", 40) ?? undefined,
  status: reportStatus(query.status)
});

export const reportExportRequest = (query: Record<string, unknown>, limit: number): { type: ReportExportType; filters: ReportExportFilters } => {
  const type = optionalText(query.reportType, "Tipo de reporte", 40);
  if (!type || !reportExportTypes.includes(type as ReportExportType)) {
    throw new AppError("Tipo de exportación no válido", 422, "INVALID_REPORT_EXPORT_TYPE");
  }
  const exportType = type as ReportExportType;
  const exportQuery = { ...query, page: "1", limit: String(limit) };
  switch (exportType) {
    case "orders": return { type: exportType, filters: { ...reportOrderFilters(exportQuery), page: 1, limit } };
    case "clients": return { type: exportType, filters: { ...reportClientFilters(exportQuery), page: 1, limit } };
    case "inventory": return { type: exportType, filters: { ...reportInventoryFilters(exportQuery), page: 1, limit } };
    case "inventory-movements": return { type: exportType, filters: { ...reportInventoryMovementFilters(exportQuery), page: 1, limit } };
    case "finance": return { type: exportType, filters: { ...reportFinanceFilters(exportQuery), page: 1, limit } };
  }
};


