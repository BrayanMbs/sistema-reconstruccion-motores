export const roles = ["ADMIN", "ADMINISTRATIVE", "CASHIER", "INVENTORY", "OPERATOR"] as const;
export type Role = (typeof roles)[number];

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  fullName: string;
  identificationType: string;
  identification: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
};

export type WorkOrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type WorkOrderPriority = "NORMAL" | "HIGH" | "URGENT";

export type WorkOrder = {
  id: string;
  code: string;
  trackingCode: string;
  clientId: string;
  clientName: string;
  engineBrand: string;
  engineModel: string;
  engineSerial: string | null;
  serviceType: string;
  description: string;
  status: WorkOrderStatus;
  progress: number;
  assignedWorkerId: string | null;
  assignedWorker: string | null;
  estimatedDate: string | null;
  createdAt: string;
  intakeNotes: string | null;
  publicNote: string | null;
  priority: WorkOrderPriority;
  startedAt: string | null;
  completedAt: string | null;
  totalAmount: number | null;
};

/** Safe milestone shown by the unauthenticated client portal. */
export type PublicTrackingMilestone = {
  type: "ORDER_RECEIVED" | "WORK_STARTED" | "PROGRESS_UPDATED" | "WORK_COMPLETED";
  title: string;
  message: string;
  progress: number | null;
  occurredAt: string;
};

/** Minimal representation returned by the unauthenticated client portal. */
export type PublicOrderTracking = {
  orderNumber: string;
  status: WorkOrderStatus;
  progress: number;
  serviceDescription: string | null;
  serviceType: string;
  engineSummary: string;
  receivedAt: string;
  estimatedDate: string | null;
  lastUpdatedAt: string;
  timeline: PublicTrackingMilestone[];
};

export type WorkOrderEvent = { id: string; workOrderId: string; actorName: string | null; eventType: string; message: string; progress: number | null; createdAt: string };
export type OperatorNotification = { id: string; workOrderId: string | null; workOrderCode: string | null; type: string; message: string; readAt: string | null; createdAt: string };

export type InventoryItemType = "PART" | "MATERIAL" | "TOOL" | "CONSUMABLE";
export type InventoryMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";
export type InventoryItem = { id: string; sku: string; name: string; description: string | null; unit: string; stockQuantity: number; minimumStock: number; type: InventoryItemType; category: string; brand: string | null; partNumber: string | null; compatibility: string | null; location: string | null; referenceUnitCost: number; referenceSupplier: string | null; isActive: boolean; createdAt: string; updatedAt: string; createdBy: string | null; updatedBy: string | null; updatedByName: string | null; lastMovementAt: string | null };
export type InventoryMovement = { id: string; inventoryItemId: string; itemCode: string; itemName: string; movementType: InventoryMovementType; quantity: number; previousStock: number; resultingStock: number; reason: string; referenceDocument: string | null; supplierReference: string | null; workOrderId: string | null; workOrderCode: string | null; observation: string | null; performedBy: string; performedByName: string | null; createdAt: string };
export type InventoryDashboard = { productsRegistered: number; totalStock: number; lowStockProducts: number; entriesThisMonth: number; exitsThisMonth: number; recentMovements: InventoryMovement[]; lowStockItems: InventoryItem[]; monthlyFlow: { entries: number; exits: number }; health: "HEALTHY" | "ATTENTION" | "CRITICAL" };
export type WorkOrderInventory = { workOrderId: string; inventoryItemId: string; sku: string; name: string; unit: string; quantity: number; assignedAt: string };
export type Payment = { id: string; workOrderId: string; workOrderCode: string; clientName: string; amount: number; method: string; reference: string | null; notes: string | null; receivedBy: string | null; createdAt: string };
export type FinancialStatus = "PENDING" | "PARTIAL" | "PAID";
export type OrderFinancialSummary = {
  workOrderId: string;
  workOrderCode: string;
  clientName: string;
  totalAmount: number | null;
  totalPaid: number;
  balance: number | null;
  financialStatus: FinancialStatus;
};
export type AppSettings = { company: { name: string; phone: string; address: string }; finance: { currency: string; taxRate: number } };

export type AuditEvent = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
