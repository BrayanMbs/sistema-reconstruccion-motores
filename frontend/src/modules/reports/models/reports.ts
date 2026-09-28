import type { InventoryItem, InventoryMovement } from "@/modules/inventory/models/inventory";

export type WorkOrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ReportSection = "ORDERS" | "CLIENTS" | "INVENTORY" | "MOVEMENTS" | "FINANCE";
export type ReportExportType = "orders" | "clients" | "inventory" | "inventory-movements" | "finance";
export type PaginatedReport<T> = { items: T[]; total: number; page: number; limit: number };

export type ReportsSummary = {
  orders: Record<WorkOrderStatus, number>;
  inventory: { total: number; low_stock: number };
  finance: { total: number; payments: number };
  assignments: { total: number; assigned: number };
  scope: { startDate: string | null; endDate: string | null; status: WorkOrderStatus | null; inventoryIsCurrentState: boolean };
};

export type ReportOrder = {
  id: string; code: string; clientId: string; clientName: string; engineBrand: string; engineModel: string;
  serviceType: string; status: WorkOrderStatus; progress: number; priority: string; assignedWorker: string | null;
  estimatedDate: string | null; createdAt: string; completedAt: string | null; totalAmount: number | null;
  totalPaid: number; balance: number | null; financialStatus: "PENDING" | "PARTIAL" | "PAID";
};

export type ReportClient = {
  id: string; fullName: string; identificationType: string; identification: string; phone: string | null;
  email: string | null; createdAt: string; orderCount: number; pendingOrders: number; inProgressOrders: number;
  completedOrders: number; cancelledOrders: number; lastOrderAt: string | null;
};

export type ReportFinance = {
  id: string; workOrderId: string; workOrderCode: string; clientName: string; amount: number; method: string;
  reference: string | null; receivedBy: string | null; createdAt: string;
};

export type ReportInventory = InventoryItem;
export type ReportInventoryMovement = InventoryMovement;

export const ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLETED: "Finalizada", CANCELLED: "Cancelada"
};

