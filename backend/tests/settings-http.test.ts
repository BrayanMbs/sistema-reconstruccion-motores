import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));

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

vi.mock("../src/services/settings.service", () => ({
  SettingsService: class {
    get = mocks.get;
    save = mocks.save;
  }
}));

import { app } from "../src/app";

const settings = {
  company: { name: "Motores López", phone: "+502 5555-1234", address: "Zona 1" },
  finance: { currency: "GTQ", taxRate: 12 }
};

const getSettings = (token?: string) => {
  const call = request(app).get("/api/admin/settings");
  return token ? call.set("Authorization", `Bearer ${token}`) : call;
};
const putSettings = (body: unknown, token?: string) => {
  const call = request(app).put("/api/admin/settings");
  return (token ? call.set("Authorization", `Bearer ${token}`) : call).send(body as object);
};

describe("settings HTTP contracts and authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(settings);
    mocks.save.mockImplementation((value: typeof settings) => Promise.resolve(value));
  });

  it("allows ADMIN to read the settings", async () => {
    const response = await getSettings("admin");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ settings });
  });

  it("allows ADMIN to update the settings with normalized values and the authenticated actor", async () => {
    const response = await putSettings({
      company: { name: "  Motores López ", phone: "+502 5555-1234", address: "Zona 1" },
      finance: { currency: "gtq", taxRate: 12 }
    }, "admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ settings });
    expect(mocks.save).toHaveBeenCalledWith(settings, "admin-id");
  });

  it.each([
    ["a tax rate above 100", { ...settings, finance: { currency: "GTQ", taxRate: 101 } }, "VALIDATION_ERROR"],
    ["a negative tax rate", { ...settings, finance: { currency: "GTQ", taxRate: -5 } }, "VALIDATION_ERROR"],
    ["an invalid currency", { ...settings, finance: { currency: "QUETZAL", taxRate: 12 } }, "VALIDATION_ERROR"],
    ["an empty company name", { ...settings, company: { ...settings.company, name: "" } }, "VALIDATION_ERROR"],
    ["a missing section", { company: settings.company }, "VALIDATION_ERROR"],
    ["an unexpected root field", { ...settings, supabaseServiceRoleKey: "secret" }, "UNEXPECTED_SETTINGS_FIELD"],
    ["an unexpected nested field", { ...settings, company: { ...settings.company, password: "secret" } }, "UNEXPECTED_SETTINGS_FIELD"]
  ])("rejects %s with 422 before saving", async (_label, body, code) => {
    const response = await putSettings(body, "admin");
    expect(response.status).toBe(422);
    expect(response.body.code).toBe(code);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects a body that is not a JSON object", async () => {
    const response = await request(app).put("/api/admin/settings").set("Authorization", "Bearer admin").set("Content-Type", "text/plain").send("company=x");
    expect(response.status).toBe(422);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("requires authentication to read or update", async () => {
    expect((await getSettings()).status).toBe(401);
    expect((await putSettings(settings)).status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each(["administrative", "cashier", "inventory", "operator"])("rejects the %s role from reading or updating", async (token) => {
    const read = await getSettings(token);
    const update = await putSettings(settings, token);
    expect(read.status).toBe(403);
    expect(update.status).toBe(403);
    expect(read.body.settings).toBeUndefined();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
