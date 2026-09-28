import { apiBaseUrl, apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import type {
  ClientReportFilters, FinanceReportFilters, InventoryReportFilters, MovementReportFilters,
  OrderReportFilters, SummaryFilters
} from "../dtos/reports.dto";
import type {
  PaginatedReport, ReportClient, ReportFinance, ReportInventory, ReportInventoryMovement,
  ReportOrder, ReportsSummary, ReportExportType
} from "../models/reports";

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export const reportsService = {
  summary: async (filters: SummaryFilters = {}) =>
    (await apiRequest<{ report: ReportsSummary }>(`/api/admin/reports/summary${query(filters)}`)).report,
  orders: async (filters: OrderReportFilters) =>
    apiRequest<PaginatedReport<ReportOrder>>(`/api/admin/reports/orders${query(filters)}`),
  clients: async (filters: ClientReportFilters) =>
    apiRequest<PaginatedReport<ReportClient>>(`/api/admin/reports/clients${query(filters)}`),
  inventory: async (filters: InventoryReportFilters) =>
    apiRequest<PaginatedReport<ReportInventory>>(`/api/admin/reports/inventory${query(filters)}`),
  movements: async (filters: MovementReportFilters) =>
    apiRequest<PaginatedReport<ReportInventoryMovement>>(`/api/admin/reports/inventory/movements${query(filters)}`),
  finance: async (filters: FinanceReportFilters) =>
    apiRequest<PaginatedReport<ReportFinance>>(`/api/admin/reports/finance${query(filters)}`),
  exportCsv: async (type: ReportExportType, filters: object) => {
    const { page: _page, limit: _limit, ...exportFilters } = filters as Record<string, string | number | undefined>;
    void _page; void _limit;
    const session = await getSupabase()?.auth.getSession();
    const token = session?.data.session?.access_token;
    const response = await fetch(`${apiBaseUrl}/api/admin/reports/export${query({ reportType: type, ...exportFilters })}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? "No fue posible exportar el reporte");
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `reporte-${type}.csv`;
    return {
      blob: await response.blob(), filename,
      truncated: response.headers.get("X-Export-Truncated") === "true",
      total: Number(response.headers.get("X-Export-Total") ?? 0)
    };
  }
};

