import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";

const mocks = vi.hoisted(() => ({
  summary: vi.fn(), orders: vi.fn(), clients: vi.fn(), inventoryItems: vi.fn(),
  inventoryMovements: vi.fn(), finance: vi.fn(), exportCsv: vi.fn()
}));

const profile = (role: Role): AppUser => ({
  id: `${role.toLowerCase()}-id`, fullName: role, email: `${role.toLowerCase()}@example.com`,
  role, isActive: true, mustChangePassword: false, createdAt: "2026-01-01", updatedAt: "2026-01-01"
});

vi.mock("../src/services/auth.service", () => ({
  AuthService: class {
    authenticateToken(token: string) {
      const roles: Record<string, Role> = {
        admin: "ADMIN", administrative: "ADMINISTRATIVE", cashier: "CASHIER",
        inventory: "INVENTORY", operator: "OPERATOR"
      };
      const role = roles[token];
      if (!role) throw new Error("INVALID_TEST_TOKEN");
      return Promise.resolve(profile(role));
    }
  }
}));

vi.mock("../src/services/reports.service", () => ({
  REPORT_EXPORT_LIMIT: 5000,
  ReportsService: class {
    summary = mocks.summary;
    orders = mocks.orders;
    clients = mocks.clients;
    inventoryItems = mocks.inventoryItems;
    inventoryMovements = mocks.inventoryMovements;
    finance = mocks.finance;
    exportCsv = mocks.exportCsv;
  }
}));

import { app } from "../src/app";

const emptyPage = { items: [], total: 0, page: 1, limit: 20 };
const summary = {
  orders: { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 },
  inventory: { total: 0, low_stock: 0 }, finance: { total: 0, payments: 0 },
  assignments: { total: 0, assigned: 0 },
  scope: { startDate: null, endDate: null, status: null, inventoryIsCurrentState: true }
};

describe("reports HTTP contracts and authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.summary.mockResolvedValue(summary);
    const prefixes: Record<string, string> = { orders: "ordenes", clients: "clientes", inventory: "inventario", "inventory-movements": "movimientos-inventario", finance: "finanzas" };
    mocks.exportCsv.mockImplementation((type: string) => Promise.resolve({ csv: "\uFEFF\"Orden\"\r\n", total: 1, exported: 1, truncated: false, filePrefix: prefixes[type] }));
    for (const operation of [mocks.orders, mocks.clients, mocks.inventoryItems, mocks.inventoryMovements, mocks.finance]) {
      operation.mockResolvedValue(emptyPage);
    }
  });

  it("returns the compatible summary without filters and consistent empty values", async () => {
    const response = await request(app).get("/api/admin/reports/summary").set("Authorization", "Bearer admin");
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual(summary);
    expect(mocks.summary).toHaveBeenCalledWith({ startDate: undefined, endDate: undefined, status: undefined });
  });

  it("passes a valid date range to the summary", async () => {
    const response = await request(app)
      .get("/api/admin/reports/summary?startDate=2026-01-01&endDate=2026-01-31")
      .set("Authorization", "Bearer admin");
    expect(response.status).toBe(200);
    expect(mocks.summary).toHaveBeenCalledWith({ startDate: "2026-01-01", endDate: "2026-01-31", status: undefined });
  });

  it("validates status, date ranges and pagination before calling the service", async () => {
    const headers = { Authorization: "Bearer admin" };
    expect((await request(app).get("/api/admin/reports/orders?status=UNKNOWN").set(headers)).status).toBe(422);
    expect((await request(app).get("/api/admin/reports/clients?startDate=2026-02-01&endDate=2026-01-01").set(headers)).body.code).toBe("INVALID_DATE_RANGE");
    expect((await request(app).get("/api/admin/reports/finance?page=0").set(headers)).body.code).toBe("INVALID_PAGINATION");
    expect(mocks.orders).not.toHaveBeenCalled();
    expect(mocks.clients).not.toHaveBeenCalled();
    expect(mocks.finance).not.toHaveBeenCalled();
  });

  it("returns paginated report results and forwards normalized filters", async () => {
    const response = await request(app)
      .get("/api/admin/reports/orders?status=COMPLETED&page=2&limit=10&search=OT-1")
      .set("Authorization", "Bearer admin");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(emptyPage);
    expect(mocks.orders).toHaveBeenCalledWith(expect.objectContaining({ status: "COMPLETED", page: 2, limit: 10, search: "OT-1" }));
  });

  it.each([
    "/api/admin/reports/orders", "/api/admin/reports/clients", "/api/admin/reports/inventory",
    "/api/admin/reports/inventory/movements", "/api/admin/reports/finance"
  ])("allows ADMIN to read %s", async (path) => {
    expect((await request(app).get(path).set("Authorization", "Bearer admin")).status).toBe(200);
  });

  it("requires authentication for report endpoints", async () => {
    expect((await request(app).get("/api/admin/reports/summary")).status).toBe(401);
    expect((await request(app).get("/api/admin/reports/finance")).status).toBe(401);
  });

  it.each(["administrative", "cashier", "inventory", "operator"])("rejects the %s role from all financial report data", async (token) => {
    const summaryResponse = await request(app).get("/api/admin/reports/summary").set("Authorization", `Bearer ${token}`);
    const financeResponse = await request(app).get("/api/admin/reports/finance").set("Authorization", `Bearer ${token}`);
    expect(summaryResponse.status).toBe(403);
    expect(financeResponse.status).toBe(403);
    expect(summaryResponse.body.report).toBeUndefined();
    expect(financeResponse.body.items).toBeUndefined();
  });

  it.each(["orders", "clients", "inventory", "inventory-movements", "finance"])("exports the allowed %s type for ADMIN", async (type) => {
    const filter = type === "inventory" ? "type=PART" : "startDate=2026-01-01";
    const response = await request(app).get(`/api/admin/reports/export?reportType=${type}&${filter}&page=9`).set("Authorization", "Bearer admin");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    const prefixes: Record<string, string> = { orders: "ordenes", clients: "clientes", inventory: "inventario", "inventory-movements": "movimientos-inventario", finance: "finanzas" };
    expect(response.headers["content-disposition"]).toMatch(new RegExp(`^attachment; filename="reporte-${prefixes[type]}-\\d{4}-\\d{2}-\\d{2}\\.csv"$`));
    expect(response.headers["x-export-truncated"]).toBe("false");
    const expectedFilter = type === "inventory" ? { type: "PART" } : { startDate: "2026-01-01" };
    expect(mocks.exportCsv).toHaveBeenLastCalledWith(type, expect.objectContaining({ ...expectedFilter, page: 1, limit: 5001 }));
  });

  it("rejects an invalid export type", async () => {
    const response = await request(app).get("/api/admin/reports/export?reportType=arbitrary").set("Authorization", "Bearer admin");
    expect(response.status).toBe(422);
    expect(response.body.code).toBe("INVALID_REPORT_EXPORT_TYPE");
    expect(mocks.exportCsv).not.toHaveBeenCalled();
  });

  it("protects exports and especially finance from unauthenticated and non-admin roles", async () => {
    expect((await request(app).get("/api/admin/reports/export?reportType=finance")).status).toBe(401);
    for (const token of ["administrative", "cashier", "inventory", "operator"]) {
      const response = await request(app).get("/api/admin/reports/export?reportType=finance").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
      expect(response.text).not.toContain("Orden");
    }
  });
});

