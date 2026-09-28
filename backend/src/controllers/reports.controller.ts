import type { Request, Response } from "express";
import { REPORT_EXPORT_LIMIT, ReportsService } from "../services/reports.service";
import {
  reportClientFilters,
  reportFinanceFilters,
  reportInventoryFilters,
  reportInventoryMovementFilters,
  reportOrderFilters,
  reportSummaryFilters
} from "../validators/reports.validators";
import { reportExportRequest } from "../validators/reports.validators";
import { reportFileDate } from "../utils/reports-csv";

const service = new ReportsService();

export const getReportsSummary = async (request: Request, response: Response): Promise<void> => {
  response.json({ report: await service.summary(reportSummaryFilters(request.query)) });
};
export const listReportOrders = async (request: Request, response: Response): Promise<void> => {
  response.json(await service.orders(reportOrderFilters(request.query)));
};
export const listReportClients = async (request: Request, response: Response): Promise<void> => {
  response.json(await service.clients(reportClientFilters(request.query)));
};
export const listReportInventory = async (request: Request, response: Response): Promise<void> => {
  response.json(await service.inventoryItems(reportInventoryFilters(request.query)));
};
export const listReportInventoryMovements = async (request: Request, response: Response): Promise<void> => {
  response.json(await service.inventoryMovements(reportInventoryMovementFilters(request.query)));
};
export const listReportFinance = async (request: Request, response: Response): Promise<void> => {
  response.json(await service.finance(reportFinanceFilters(request.query)));
};
export const exportReportsCsv = async (request: Request, response: Response): Promise<void> => {
  const { type, filters } = reportExportRequest(request.query, REPORT_EXPORT_LIMIT + 1);
  const exported = await service.exportCsv(type, filters);
  const date = reportFileDate();
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="reporte-${exported.filePrefix}-${date}.csv"`);
  response.setHeader("X-Export-Total", String(exported.total));
  response.setHeader("X-Export-Count", String(exported.exported));
  response.setHeader("X-Export-Truncated", String(exported.truncated));
  response.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Export-Total, X-Export-Count, X-Export-Truncated");
  response.send(exported.csv);
};
