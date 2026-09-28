import type { InventoryItemType, InventoryMovementType } from "@/modules/inventory/models/inventory";
import type { WorkOrderStatus } from "../models/reports";

export type SummaryFilters = { startDate?: string; endDate?: string; status?: WorkOrderStatus | "" };
export type OrderReportFilters = SummaryFilters & { search?: string; page: number; limit: number };
export type ClientReportFilters = SummaryFilters & { search?: string; page: number; limit: number };
export type InventoryReportFilters = {
  search?: string; type?: InventoryItemType | ""; category?: string;
  status?: "ACTIVE" | "INACTIVE" | "LOW" | "OUT" | ""; page: number; limit: number;
};
export type MovementReportFilters = {
  startDate?: string; endDate?: string; itemId?: string; movementType?: InventoryMovementType | "";
  responsibleUserId?: string; reason?: string; workOrderId?: string; page: number; limit: number;
};
export type FinanceReportFilters = SummaryFilters & { search?: string; method?: string; page: number; limit: number };

