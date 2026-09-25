import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  clientRelease: vi.fn(),
  poolConnect: vi.fn()
}));

vi.mock("../src/config/database", () => ({
  databasePool: { connect: mocks.poolConnect }
}));

import { InventoryRepository } from "../src/repositories/inventory.repository";

const activeItem = { id: "item-1", sku: "ACE-1", name: "Aceite", stock_quantity: "5", is_active: true };

describe("InventoryRepository order allocations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.poolConnect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.clientRelease });
  });

  it("commits the stock exit and order allocation together", async () => {
    mocks.clientQuery.mockImplementation((sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT") return Promise.resolve({});
      if (sql.includes("FROM inventory_items")) return Promise.resolve({ rowCount: 1, rows: [activeItem] });
      if (sql.includes("FROM work_orders")) return Promise.resolve({ rowCount: 1, rows: [{ id: "order-1" }] });
      if (sql.includes("INSERT INTO inventory_movements")) return Promise.resolve({ rows: [{ id: "movement-1", inventory_item_id: "item-1", movement_type: "EXIT", quantity: "2", previous_stock: "5", resulting_stock: "3", reason: "Uso en reparación", reference_document: null, supplier_reference: null, work_order_id: "order-1", observation: null, performed_by: "actor", created_at: "2026-01-01" }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });

    await new InventoryRepository().allocate("order-1", "item-1", 2, "actor");

    expect(mocks.clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mocks.clientQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE inventory_items"), ["item-1", 3, "actor"]);
    expect(mocks.clientQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO work_order_inventory"), ["order-1", "item-1", 2, "actor"]);
    expect(mocks.clientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
  });

  it("rolls back the stock exit when creating the order allocation fails", async () => {
    mocks.clientQuery.mockImplementation((sql: string) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") return Promise.resolve({});
      if (sql.includes("FROM inventory_items")) return Promise.resolve({ rowCount: 1, rows: [activeItem] });
      if (sql.includes("FROM work_orders")) return Promise.resolve({ rowCount: 1, rows: [{ id: "order-1" }] });
      if (sql.includes("INSERT INTO inventory_movements")) return Promise.resolve({ rows: [{ id: "movement-1", inventory_item_id: "item-1", movement_type: "EXIT", quantity: "2", previous_stock: "5", resulting_stock: "3", reason: "Uso en reparación", reference_document: null, supplier_reference: null, work_order_id: "order-1", observation: null, performed_by: "actor", created_at: "2026-01-01" }] });
      if (sql.includes("INSERT INTO work_order_inventory")) return Promise.reject(new Error("allocation insert failed"));
      return Promise.resolve({ rowCount: 1, rows: [] });
    });

    await expect(new InventoryRepository().allocate("order-1", "item-1", 2, "actor")).rejects.toThrow("allocation insert failed");

    expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.clientQuery).not.toHaveBeenCalledWith("COMMIT");
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
  });
});
