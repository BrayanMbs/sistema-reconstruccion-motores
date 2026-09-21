import { describe, expect, it } from "vitest";
import { stockState, type InventoryItem } from "./inventory";

const item = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({ id: "item", sku: "FIL-1", name: "Filtro", description: null, unit: "unidad", stockQuantity: 8, minimumStock: 3, type: "PART", category: "Repuestos de motor", brand: null, partNumber: null, compatibility: null, location: null, referenceUnitCost: 0, referenceSupplier: null, isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01", createdBy: null, updatedBy: null, updatedByName: null, lastMovementAt: null, ...overrides });
describe("inventory stock state", () => {
  it("calculates sufficient, low, exhausted and inactive states from real item fields", () => { expect(stockState(item()).label).toBe("Stock suficiente"); expect(stockState(item({ stockQuantity: 3 })).label).toBe("Stock bajo"); expect(stockState(item({ stockQuantity: 0 })).label).toBe("Agotado"); expect(stockState(item({ isActive: false })).label).toBe("Inactivo"); });
});
