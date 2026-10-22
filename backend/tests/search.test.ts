import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { AppUser } from "../src/models/domain";

const { mockSearch } = vi.hoisted(() => ({ mockSearch: vi.fn() }));

const adminProfile: AppUser = {
  id: "admin-id",
  fullName: "Admin",
  email: "admin@example.com",
  role: "ADMIN",
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01"
};

vi.mock("../src/services/auth.service", () => ({
  AuthService: class {
    authenticateToken(token: string) {
      if (token === "admin-token") return Promise.resolve(adminProfile);
      throw new Error("INVALID_TEST_TOKEN");
    }
  }
}));

vi.mock("../src/repositories/search.repository", () => ({
  SearchRepository: class {
    search = mockSearch;
  }
}));

import { app } from "../src/app";

describe("Global Search API (/api/admin/search)", () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockSearch.mockResolvedValue({
      orders: [
        { id: "wo-1", code: "OT-2026-00001", engineBrand: "Toyota", engineModel: "1KD-FTV", status: "IN_PROGRESS", clientName: "Carlos Mendoza" }
      ],
      clients: [
        { id: "c-1", fullName: "Carlos Mendoza", identificationType: "DPI", identification: "1234567890101", phone: "55551234", email: "carlos@test.com" }
      ],
      users: [
        { id: "u-1", fullName: "Carlos Operador", email: "carlos.op@test.com", role: "OPERATOR", isActive: true }
      ],
      inventory: [
        { id: "inv-1", code: "REP-CUL-01", name: "Culata Toyota 1KD", category: "Culatas", brand: "Toyota", stock: 5 }
      ]
    });
  });

  it("returns results matching search term across orders, clients, users and inventory", async () => {
    const res = await request(app)
      .get("/api/admin/search?q=Toyota")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body.query).toBe("Toyota");
    expect(res.body.results).toBeDefined();
    expect(res.body.results.orders).toHaveLength(1);
    expect(res.body.results.orders[0].code).toBe("OT-2026-00001");
    expect(res.body.results.clients).toHaveLength(1);
    expect(res.body.results.inventory).toHaveLength(1);
  });

  it("returns empty results if search term is shorter than 2 characters without calling repository", async () => {
    const res = await request(app)
      .get("/api/admin/search?q=a")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body.results.orders).toHaveLength(0);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("rejects malicious SQL injection payloads in search query with 422", async () => {
    const res = await request(app)
      .get("/api/admin/search?q=' OR '1'='1")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/patrones no permitidos/);
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
