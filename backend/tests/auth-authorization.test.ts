import type { AppUser } from "../src/models/domain";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), signInWithPassword: vi.fn(), findById: vi.fn() }));

vi.mock("../src/config/supabase", () => ({
  createSupabaseClient: () => ({ auth: { getUser: mocks.getUser, signInWithPassword: mocks.signInWithPassword } })
}));
vi.mock("../src/repositories/user.repository", () => ({
  UserRepository: class { findById = mocks.findById; }
}));

import { AuthService } from "../src/services/auth.service";

const user = (overrides: Partial<AppUser> = {}): AppUser => ({
  id: "a4c71ea9-6fd6-4531-b27e-6ea8fe0fbad3", fullName: "Admin", email: "admin@example.com", role: "ADMIN", isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01", ...overrides
});

describe("AuthService authorization", () => {
  it("rejects an inactive Supabase user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: user().id } }, error: null });
    mocks.findById.mockResolvedValue(user({ isActive: false }));
    await expect(new AuthService().authenticateToken("token")).rejects.toMatchObject({ statusCode: 403, code: "USER_INACTIVE" });
  });

  it("allows an active operational user to sign in", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: user().id }, session: { access_token: "access", refresh_token: "refresh", expires_at: 1 } }, error: null });
    mocks.findById.mockResolvedValue(user({ role: "OPERATOR" }));
    await expect(new AuthService().signIn("operator@example.com", "secure-password")).resolves.toMatchObject({ user: { role: "OPERATOR" } });
  });
});
