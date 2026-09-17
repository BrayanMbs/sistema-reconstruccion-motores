import type { Role, WorkOrderStatus } from "../models/domain";

export type CreateUserDto = { fullName: string; email: string; password: string; role: Role };
export type UpdateUserDto = { fullName?: string; role?: Role };
export type CreateClientDto = { fullName: string; identificationType: "DPI" | "NIT" | "PASSPORT"; identification: string; phone?: string | null; email?: string | null; address?: string | null };
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
};
