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
  assignedWorker: string | null;
  estimatedDate: string | null;
  createdAt: string;
  intakeNotes: string | null;
  publicNote: string | null;
};

export type AuditEvent = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
