import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("../src/config/database", () => ({ databasePool: { query } }));

import { ReportsRepository } from "../src/repositories/reports.repository";
import { InventoryRepository } from "../src/repositories/inventory.repository";

describe("ReportsRepository", () => {
  beforeEach(() => query.mockReset());

  it("normalizes an empty summary and keeps current inventory explicit", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ pending: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0, assigned: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0, low_stock: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: "0.00", payments: 0 }] });

    await expect(new ReportsRepository().summary({})).resolves.toEqual({
      orders: { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 },
      inventory: { total: 0, low_stock: 0 }, finance: { total: 0, payments: 0 },
      assignments: { total: 0, assigned: 0 },
      scope: { startDate: null, endDate: null, status: null, inventoryIsCurrentState: true }
    });
  });

  it("parameterizes summary period and status filters", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ pending: 0, in_progress: 0, completed: 2, cancelled: 0, total: 2, assigned: 2 }] })
      .mockResolvedValueOnce({ rows: [{ total: 3, low_stock: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: "150.50", payments: 2 }] });

    await new ReportsRepository().summary({ startDate: "2026-01-01", endDate: "2026-01-31", status: "COMPLETED" });

    expect(query.mock.calls[0][1]).toEqual(["2026-01-01", "2026-01-31", "COMPLETED"]);
    expect(query.mock.calls[2][1]).toEqual(["2026-01-01", "2026-01-31", "COMPLETED"]);
    expect(query.mock.calls[0][0]).toContain("$1::date");
    expect(query.mock.calls[0][0]).toContain("AT TIME ZONE 'America/Guatemala'");
    expect(query.mock.calls[0][0]).toContain("< ($2::date + interval '1 day')");
    expect(query.mock.calls[0][0]).not.toContain("2026-01-01");
  });

  it("parameterizes report search and applies pagination", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await new ReportsRepository().orders({
      search: "OT-%' OR true --", status: "PENDING", page: 2, limit: 10
    });

    expect(result).toEqual({ items: [], total: 0, page: 2, limit: 10 });
    expect(query.mock.calls[0][1]).toEqual(["PENDING", "%OT-%' OR true --%"]);
    expect(query.mock.calls[1][1]).toEqual(["PENDING", "%OT-%' OR true --%", 10, 10]);
    expect(query.mock.calls[1][0]).not.toContain("OR true");
  });

  it("uses inclusive Guatemala business dates for inventory movements", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: 0, units: "0" }] })
      .mockResolvedValueOnce({ rows: [{ entries: 0, exits: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await new InventoryRepository().movements({ startDate: "2026-01-01", endDate: "2026-01-31", page: 1, limit: 20 });

    expect(query.mock.calls[0][0]).toContain("(m.created_at AT TIME ZONE 'America/Guatemala') >= $1::date");
    expect(query.mock.calls[0][0]).toContain("(m.created_at AT TIME ZONE 'America/Guatemala') < ($2::date + interval '1 day')");
    expect(query.mock.calls[0][1]).toEqual(["2026-01-01", "2026-01-31", 20, 0]);
  });
});

