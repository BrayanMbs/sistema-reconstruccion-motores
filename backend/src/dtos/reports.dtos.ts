import type { InventoryListFilters, InventoryMovementFilters } from "./inventory.dtos";
import type { WorkOrderStatus } from "../models/domain";

export type ReportDateRange = { startDate?: string; endDate?: string };
export type ReportPage = { page: number; limit: number };
export type ReportOrderFilters = ReportDateRange & ReportPage & { search?: string; status?: WorkOrderStatus };
export type ReportClientFilters = ReportDateRange & ReportPage & { search?: string; status?: WorkOrderStatus };
export type ReportFinanceFilters = ReportDateRange & ReportPage & { search?: string; method?: string; status?: WorkOrderStatus };
export type ReportSummaryFilters = ReportDateRange & { status?: WorkOrderStatus };
export type ReportInventoryFilters = InventoryListFilters;
export type ReportInventoryMovementFilters = InventoryMovementFilters;
export const reportExportTypes = ["orders", "clients", "inventory", "inventory-movements", "finance"] as const;
export type ReportExportType = (typeof reportExportTypes)[number];
export type ReportExportFilters = ReportOrderFilters | ReportClientFilters | ReportInventoryFilters | ReportInventoryMovementFilters | ReportFinanceFilters;

export type ReportOrderRow = {
  id: string; code: string; clientId: string; clientName: string; engineBrand: string; engineModel: string;
  serviceType: string; status: WorkOrderStatus; progress: number; priority: string; assignedWorker: string | null;
  estimatedDate: string | null; createdAt: string; completedAt: string | null; totalAmount: number | null;
  totalPaid: number; balance: number | null; financialStatus: "PENDING" | "PARTIAL" | "PAID";
};

export type ReportClientRow = {
  id: string; fullName: string; identificationType: string; identification: string; phone: string | null;
  email: string | null; createdAt: string; orderCount: number; pendingOrders: number; inProgressOrders: number;
  completedOrders: number; cancelledOrders: number; lastOrderAt: string | null;
};

export type ReportFinanceRow = {
  id: string; workOrderId: string; workOrderCode: string; clientName: string; amount: number; method: string;
  reference: string | null; receivedBy: string | null; createdAt: string;
};

export type PaginatedReport<T> = { items: T[]; total: number; page: number; limit: number };

