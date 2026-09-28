import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ orders: vi.fn(), clients: vi.fn(), finance: vi.fn(), inventory: vi.fn(), movements: vi.fn(), csv: vi.fn() }));
vi.mock("../src/repositories/reports.repository", () => ({ ReportsRepository: class { summary = vi.fn(); orders = mocks.orders; clients = mocks.clients; finance = mocks.finance; } }));
vi.mock("../src/repositories/inventory.repository", () => ({ InventoryRepository: class { list = mocks.inventory; movements = mocks.movements; } }));
vi.mock("../src/utils/reports-csv", () => ({ buildReportCsv: mocks.csv, exportFileNames: { orders: "ordenes", clients: "clientes", inventory: "inventario", "inventory-movements": "movimientos-inventario", finance: "finanzas" } }));

import { REPORT_EXPORT_LIMIT, ReportsService } from "../src/services/reports.service";

describe("ReportsService CSV export", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.csv.mockReturnValue("csv");
    for (const operation of [mocks.orders, mocks.clients, mocks.finance, mocks.inventory, mocks.movements]) operation.mockResolvedValue({ items: [], total: 0, page: 1, limit: REPORT_EXPORT_LIMIT + 1 });
  });

  it.each([
    ["orders", "orders"], ["clients", "clients"], ["inventory", "inventory"],
    ["inventory-movements", "movements"], ["finance", "finance"]
  ] as const)("exports %s through its canonical query", async (type, operation) => {
    const result = await new ReportsService().exportCsv(type, { page: 1, limit: REPORT_EXPORT_LIMIT + 1 });
    expect(mocks[operation]).toHaveBeenCalledOnce();
    expect(mocks.csv).toHaveBeenCalledWith(type, []);
    expect(result).toMatchObject({ csv: "csv", total: 0, exported: 0, truncated: false });
  });

  it("caps exported rows and reports truncation", async () => {
    const rows = Array.from({ length: REPORT_EXPORT_LIMIT + 1 }, (_, id) => ({ id }));
    mocks.finance.mockResolvedValue({ items: rows, total: 7000 });
    const result = await new ReportsService().exportCsv("finance", { page: 1, limit: REPORT_EXPORT_LIMIT + 1 });
    expect(mocks.csv.mock.calls[0][1]).toHaveLength(REPORT_EXPORT_LIMIT);
    expect(result).toMatchObject({ total: 7000, exported: REPORT_EXPORT_LIMIT, truncated: true });
  });
});

