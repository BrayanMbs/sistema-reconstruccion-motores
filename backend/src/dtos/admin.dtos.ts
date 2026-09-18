import type { PublicTrackingMilestone, Role, WorkOrderPriority, WorkOrderStatus } from "../models/domain";

export type CreateUserDto = { fullName: string; email: string; password: string; role: Role };
export type UpdateUserDto = { fullName?: string; role?: Role };
export type CreateClientDto = { fullName: string; identificationType: "DPI" | "NIT" | "PASSPORT"; identification: string; phone?: string | null; email?: string | null; address?: string | null };
export type UpdateClientDto = CreateClientDto;
export type CreateInventoryItemDto = { sku: string; name: string; description?: string | null; unit: string; stockQuantity: number; minimumStock: number };
export type CreatePaymentDto = { workOrderId: string; amount: number; method: string; reference?: string | null; notes?: string | null };
export type CreateWorkOrderDto = {
  clientId: string;
  engineBrand: string;
  engineModel: string;
  engineSerial?: string | null;
  serviceType: string;
  description: string;
  estimatedDate?: string | null;
  intakeNotes?: string | null;
  publicNote?: string | null;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
};
export type UpdateWorkOrderDto = Pick<CreateWorkOrderDto, "engineBrand" | "engineModel" | "engineSerial" | "serviceType" | "description" | "estimatedDate" | "intakeNotes" | "publicNote" | "priority">;

export type UpdateOperationalProgressDto = { progress: number; observation: string };

export type PublicOrderTrackingQueryDto = { orderNumber: string; trackingCode: string };
export type PublicOrderTrackingDto = {
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
