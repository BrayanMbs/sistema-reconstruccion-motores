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

export type WorkOrder = {
  id: string;
  code: string;
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
};

export type InventoryItem = { id: string; sku: string; name: string; description: string | null; unit: string; stockQuantity: number; minimumStock: number; createdAt: string; updatedAt: string };
export type WorkOrderInventory = { workOrderId: string; inventoryItemId: string; sku: string; name: string; unit: string; quantity: number; assignedAt: string };
export type Payment = { id: string; workOrderId: string; workOrderCode: string; clientName: string; amount: number; method: string; reference: string | null; notes: string | null; receivedBy: string | null; createdAt: string };
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
