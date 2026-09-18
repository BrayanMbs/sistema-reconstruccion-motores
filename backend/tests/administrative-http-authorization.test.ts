import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";

const profile = (role: Role): AppUser => ({
  id: `${role.toLowerCase()}-id`,
  fullName: role,
  email: `${role.toLowerCase()}@example.com`,
  role,
  isActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01"
});

vi.mock("../src/services/auth.service", () => ({
  AuthService: class {
    authenticateToken(token: string) {
      const roles: Record<string, Role> = { admin: "ADMIN", administrative: "ADMINISTRATIVE", operator: "OPERATOR" };
      const role = roles[token];
      if (!role) throw new Error("INVALID_TEST_TOKEN");
      return Promise.resolve(profile(role));
    }
  }
}));

vi.mock("../src/services/administrative-dashboard.service", () => ({
  AdministrativeDashboardService: class {
    summary() { return Promise.resolve({ clients: 0, orders: { total: 0, pending: 0, in_progress: 0, completed: 0, unassigned: 0 }, upcoming: [] }); }
  }
}));

import { app } from "../src/app";

const get = (path: string, token?: string) => {
  const call = request(app).get(path);
  return token ? call.set("Authorization", `Bearer ${token}`) : call;
};

describe("administrative HTTP authorization", () => {
  it("returns 401 without authentication", async () => { expect((await get("/api/administrativo/dashboard")).status).toBe(401); });
  it("allows an active ADMINISTRATIVE user", async () => { expect((await get("/api/administrativo/dashboard", "administrative")).status).toBe(200); });
  it.each(["admin", "operator"])("rejects %s from administrative routes", async (token) => { expect((await get("/api/administrativo/dashboard", token)).status).toBe(403); });
  it.each(["users", "audit", "inventory", "payments", "settings"])("rejects ADMINISTRATIVE from /api/admin/%s", async (resource) => { expect((await get(`/api/admin/${resource}`, "administrative")).status).toBe(403); });
  it("rejects ADMINISTRATIVE from operational routes", async () => { expect((await get("/api/operativo/dashboard", "administrative")).status).toBe(403); });
});
