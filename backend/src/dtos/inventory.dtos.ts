import type { InventoryItemType, InventoryMovementType } from "../models/domain";

export type CreateInventoryItemInput = {
  code: string; name: string; type: InventoryItemType; category: string; brand: string | null;
  partNumber: string | null; description: string | null; compatibility: string | null; unit: string;
  location: string | null; minimumStock: number; initialStock: number; referenceUnitCost: number;
  referenceSupplier: string | null; isActive: boolean;
};

export type UpdateInventoryItemInput = Omit<CreateInventoryItemInput, "code" | "initialStock">;
export type InventoryMovementInput = {
  quantity: number; reason: string; referenceDocument: string | null; supplierReference: string | null;
  workOrderId: string | null; observation: string | null;
};
export type InventoryListFilters = { search?: string; type?: InventoryItemType; category?: string; status?: "ACTIVE" | "INACTIVE" | "LOW" | "OUT"; page: number; limit: number };
export type InventoryMovementFilters = { itemId?: string; movementType?: InventoryMovementType; responsibleUserId?: string; reason?: string; startDate?: string; endDate?: string; workOrderId?: string; page: number; limit: number };
