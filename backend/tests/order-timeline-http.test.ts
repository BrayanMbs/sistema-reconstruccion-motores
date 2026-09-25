import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";
import { AppError } from "../src/utils/app-error";

const orderId = "11111111-1111-4111-8111-111111111111";
const otherOrderId = "22222222-2222-4222-8222-222222222222";
const profile = (role: Role): AppUser => ({ id: `${role.toLowerCase()}-id`, fullName: role, email: `${role.toLowerCase()}@example.com`, role, isActive: true, mustChangePassword: false, createdAt: "2026-01-01", updatedAt: "2026-01-01" });
const items = [{ id: "order:1", type: "ORDER_CREATED", title: "Orden creada", description: "La orden fue registrada.", occurredAt: "2026-09-25T08:00:00.000Z", actor: null, progress: null }];

vi.mock("../src/services/auth.service", () => ({
  AuthService: class { authenticateToken(token: string) { const roles: Record<string, Role> = { admin: "ADMIN", administrative: "ADMINISTRATIVE", operator: "OPERATOR", cashier: "CASHIER" }; if (!roles[token]) throw new Error("INVALID_TEST_TOKEN"); return Promise.resolve(profile(roles[token])); } }
}));
vi.mock("../src/services/work-order.service", () => ({
  WorkOrderService: class { timeline(id: string) { if (id !== orderId) return Promise.reject(new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND")); return Promise.resolve(items); } }
}));
vi.mock("../src/services/operational.service", () => ({
  OperationalService: class { timeline(_workerId: string, id: string) { if (id !== orderId) return Promise.reject(new AppError("No tienes acceso a esta orden", 403, "ORDER_NOT_OWNED")); return Promise.resolve(items); } }
}));

import { app } from "../src/app";

const get = (path: string, token?: string) => { const call = request(app).get(path); return token ? call.set("Authorization", `Bearer ${token}`) : call; };

describe("private order timeline HTTP endpoints", () => {
  it("requires authentication and returns normalized events to authorized administrative roles", async () => {
    expect((await get(`/api/admin/work-orders/${orderId}/timeline`)).status).toBe(401);
    const response = await get(`/api/administrativo/work-orders/${orderId}/timeline`, "administrative");
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual(items);
  });

  it("rejects roles without order access and invalid ids", async () => {
    expect((await get(`/api/admin/work-orders/${orderId}/timeline`, "cashier")).status).toBe(403);
    expect((await get("/api/admin/work-orders/not-a-uuid/timeline", "admin")).status).toBe(422);
  });

  it("keeps operator timeline access scoped to assigned orders", async () => {
    expect((await get(`/api/operativo/orders/${orderId}/timeline`, "operator")).status).toBe(200);
    const response = await get(`/api/operativo/orders/${otherOrderId}/timeline`, "operator");
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ORDER_NOT_OWNED");
  });

  it("returns 404 when an authorized admin requests a missing order", async () => {
    expect((await get(`/api/admin/work-orders/${otherOrderId}/timeline`, "admin")).status).toBe(404);
  });
});
