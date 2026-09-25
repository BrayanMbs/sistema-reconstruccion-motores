import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";

const mocks = vi.hoisted(() => ({ resetPassword: vi.fn(), changeTemporaryPassword: vi.fn() }));
const profile = (role: Role, mustChangePassword = false): AppUser => ({ id: `${role.toLowerCase()}-id`, fullName: role, email: `${role.toLowerCase()}@example.com`, role, isActive: true, mustChangePassword, createdAt: "2026-01-01", updatedAt: "2026-01-01" });

vi.mock("../src/services/auth.service", () => ({
  AuthService: class {
    authenticateToken(token: string) {
      const roles: Record<string, [Role, boolean]> = { admin: ["ADMIN", false], administrative: ["ADMINISTRATIVE", false], operator: ["OPERATOR", false], inventory: ["INVENTORY", false], cashier: ["CASHIER", false], pending: ["OPERATOR", true] };
      const found = roles[token];
      if (!found) throw new Error("INVALID_TEST_TOKEN");
      return Promise.resolve(profile(...found));
    }
  }
}));
vi.mock("../src/services/user.service", () => ({
  UserService: class { resetPassword = mocks.resetPassword; changeTemporaryPassword = mocks.changeTemporaryPassword; }
}));

import { app } from "../src/app";

describe("password reset HTTP protection", () => {
  it("allows only ADMIN to reset a password", async () => {
    mocks.resetPassword.mockResolvedValue({ temporaryPassword: "one-time-password" });
    expect((await request(app).post("/api/admin/users/user-1/reset-password")).status).toBe(401);
    const allowed = await request(app).post("/api/admin/users/user-1/reset-password").set("Authorization", "Bearer admin");
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ temporaryPassword: "one-time-password" });
    await Promise.all(["administrative", "operator", "inventory", "cashier"].map(async (token) => {
      expect((await request(app).post("/api/admin/users/user-1/reset-password").set("Authorization", `Bearer ${token}`)).status).toBe(403);
    }));
  });

  it("blocks a temporary-password user from private routes but allows the password change", async () => {
    expect((await request(app).get("/api/operativo/dashboard").set("Authorization", "Bearer pending")).body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    mocks.changeTemporaryPassword.mockResolvedValue(profile("OPERATOR", false));
    const changed = await request(app).post("/api/auth/change-temporary-password").set("Authorization", "Bearer pending").send({ newPassword: "A-new-password1!" });
    expect(changed.status).toBe(200);
    expect(mocks.changeTemporaryPassword).toHaveBeenCalledWith("operator-id", "A-new-password1!");
  });
});
