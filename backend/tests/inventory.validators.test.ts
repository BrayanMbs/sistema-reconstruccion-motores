import { describe, expect, it } from "vitest";
import { validateCreateInventoryItem, validateMovement, validateUpdateInventoryItem } from "../src/validators/inventory.validators";

const product = { code: "FIL-001", name: "Filtro de aceite", type: "PART", category: "Repuestos de motor", unit: "unidad", initialStock: 5, minimumStock: 2, referenceUnitCost: 120 };
describe("inventory validators", () => {
  it("validates a complete product and preserves numeric stock values", () => { const result = validateCreateInventoryItem(product); expect(result.initialStock).toBe(5); expect(result.minimumStock).toBe(2); expect(result.type).toBe("PART"); });
  it("rejects negative stock and invalid numeric values", () => { expect(() => validateCreateInventoryItem({ ...product, initialStock: -1 })).toThrow(/mayor o igual a cero/); expect(() => validateCreateInventoryItem({ ...product, referenceUnitCost: "NaN" })).toThrow(/número válido/); });
  it("does not allow direct stock changes during an update", () => { expect(() => validateUpdateInventoryItem({ ...product, stockQuantity: 30 })).toThrow(/existencia actual/); expect(() => validateUpdateInventoryItem({ ...product, currentStock: 30 })).toThrow(/existencia actual/); });
  it("requires a positive quantity for entries and exits", () => { expect(() => validateMovement({ quantity: 0, reason: "Compra a proveedor" }, "ENTRY")).toThrow(/mayor que cero/); expect(() => validateMovement({ quantity: -1, reason: "Uso en reparación", workOrderId: "order" }, "EXIT")).toThrow(/mayor o igual a cero/); });
  it("requires an active work order reference for repair exits", () => { expect(() => validateMovement({ quantity: 1, reason: "Uso en reparación" }, "EXIT")).toThrow(/orden relacionada/); });
});
