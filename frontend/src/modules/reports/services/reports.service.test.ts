import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("@/shared/services/api", () => ({ apiRequest, apiBaseUrl: "http://api.test" }));
const getSession = vi.hoisted(() => vi.fn());
vi.mock("@/shared/services/supabase", () => ({ getSupabase: () => ({ auth: { getSession } }) }));

import { reportsService } from "./reports.service";

describe("reportsService", () => {
  beforeEach(() => {
    apiRequest.mockReset().mockResolvedValue({ report: {}, items: [], total: 0, page: 1, limit: 20 });
    getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
  });

  it("consumes every real reports endpoint with serialized filters", async () => {
    await reportsService.summary({ startDate: "2026-01-01", status: "COMPLETED" });
    await reportsService.orders({ search: "OT 1", page: 2, limit: 20 });
    await reportsService.clients({ page: 1, limit: 20 });
    await reportsService.inventory({ status: "LOW", page: 1, limit: 20 });
    await reportsService.movements({ movementType: "EXIT", page: 1, limit: 20 });
    await reportsService.finance({ method: "Efectivo", page: 1, limit: 20 });

    expect(apiRequest.mock.calls.map(([path]) => path)).toEqual([
      "/api/admin/reports/summary?startDate=2026-01-01&status=COMPLETED",
      "/api/admin/reports/orders?search=OT+1&page=2&limit=20",
      "/api/admin/reports/clients?page=1&limit=20",
      "/api/admin/reports/inventory?status=LOW&page=1&limit=20",
      "/api/admin/reports/inventory/movements?movementType=EXIT&page=1&limit=20",
      "/api/admin/reports/finance?method=Efectivo&page=1&limit=20"
    ]);
  });

  it("downloads CSV with current filters but without pagination", async () => {
    const blob = new Blob(["csv"], { type: "text/csv" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, blob: () => Promise.resolve(blob),
      headers: new Headers({ "Content-Disposition": 'attachment; filename="reporte-ordenes-2026-09-28.csv"', "X-Export-Truncated": "true", "X-Export-Total": "6000" })
    } as Response);
    const result = await reportsService.exportCsv("orders", { search: "motor", status: "COMPLETED", page: 3, limit: 20 });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/reports/export?reportType=orders&search=motor&status=COMPLETED");
    expect(fetchMock.mock.calls[0][0]).not.toContain("page=");
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: "Bearer token" } });
    expect(result).toEqual({ blob, filename: "reporte-ordenes-2026-09-28.csv", truncated: true, total: 6000 });
    fetchMock.mockRestore();
  });
});

