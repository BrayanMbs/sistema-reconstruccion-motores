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
import { InventoryRepository } from "../repositories/inventory.repository";
import { ReportsRepository } from "../repositories/reports.repository";
import { buildReportCsv, exportFileNames } from "../utils/reports-csv";

export const REPORT_EXPORT_LIMIT = 5000;

export class ReportsService {
  private readonly reports = new ReportsRepository();
  private readonly inventory = new InventoryRepository();

  summary(filters: ReportSummaryFilters = {}) { return this.reports.summary(filters); }
  orders(filters: ReportOrderFilters) { return this.reports.orders(filters); }
  clients(filters: ReportClientFilters) { return this.reports.clients(filters); }
  inventoryItems(filters: ReportInventoryFilters) { return this.inventory.list(filters); }
  inventoryMovements(filters: ReportInventoryMovementFilters) { return this.inventory.movements(filters); }
  finance(filters: ReportFinanceFilters) { return this.reports.finance(filters); }

  async exportCsv(type: ReportExportType, filters: ReportExportFilters) {
    let result: { items: unknown[]; total: number };
    switch (type) {
      case "orders": result = await this.orders(filters as ReportOrderFilters); break;
      case "clients": result = await this.clients(filters as ReportClientFilters); break;
      case "inventory": result = await this.inventoryItems(filters as ReportInventoryFilters); break;
      case "inventory-movements": result = await this.inventoryMovements(filters as ReportInventoryMovementFilters); break;
      case "finance": result = await this.finance(filters as ReportFinanceFilters); break;
    }
    const rows = result.items.slice(0, REPORT_EXPORT_LIMIT);
    const truncated = result.total > REPORT_EXPORT_LIMIT || result.items.length > REPORT_EXPORT_LIMIT;
    return { csv: buildReportCsv(type, rows), total: result.total, exported: rows.length, truncated, filePrefix: exportFileNames[type] };
  }
}
