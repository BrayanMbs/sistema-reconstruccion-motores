import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  setMustChangePassword: vi.fn(),
  recordAudit: vi.fn(),
  updateAuthUser: vi.fn(),
  clientQuery: vi.fn(),
  clientRelease: vi.fn(),
  poolConnect: vi.fn()
}));

vi.mock("../src/repositories/user.repository", () => ({
  UserRepository: class { findById = mocks.findById; setMustChangePassword = mocks.setMustChangePassword; }
}));
vi.mock("../src/services/audit.service", () => ({ AuditService: class { record = mocks.recordAudit; } }));
vi.mock("../src/config/database", () => ({ databasePool: { connect: mocks.poolConnect } }));
vi.mock("../src/config/supabase", () => ({ createSupabaseAdminClient: () => ({ auth: { admin: { updateUserById: mocks.updateAuthUser } } }) }));

import { UserService } from "../src/services/user.service";
import { validateNewPassword } from "../src/validators/auth.validators";

const user = { id: "worker-1", fullName: "Operador", email: "operator@example.com", role: "OPERATOR" as const, isActive: true, mustChangePassword: false, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

describe("credential reset flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.poolConnect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.clientRelease });
    mocks.clientQuery.mockResolvedValue({});
    mocks.setMustChangePassword.mockResolvedValue(user);
    mocks.recordAudit.mockResolvedValue(undefined);
    mocks.updateAuthUser.mockResolvedValue({ data: { user: { id: user.id } }, error: null });
  });

  it("sets mandatory change, updates Supabase and audits without storing the temporary password", async () => {
    mocks.findById.mockResolvedValue(user);

    const result = await new UserService().resetPassword(user.id, "admin-1");

    expect(result.temporaryPassword).toMatch(/[A-Za-z0-9_-]{20,}Aa1!/);
    expect(mocks.setMustChangePassword).toHaveBeenCalledWith(user.id, true, expect.anything());
    expect(mocks.updateAuthUser).toHaveBeenCalledWith(user.id, { password: result.temporaryPassword, email_confirm: true });
    expect(mocks.recordAudit).toHaveBeenCalledWith("admin-1", "PASSWORD_RESET_BY_ADMIN", "USER", user.id, { role: "OPERATOR" }, expect.anything());
    expect(JSON.stringify(mocks.recordAudit.mock.calls)).not.toContain(result.temporaryPassword);
    expect(mocks.clientQuery).toHaveBeenCalledWith("COMMIT");
  });

  it("rolls back the profile flag and audit when Supabase rejects the reset", async () => {
    mocks.findById.mockResolvedValue(user);
    mocks.updateAuthUser.mockResolvedValue({ data: { user: null }, error: { message: "provider unavailable" } });

    await expect(new UserService().resetPassword(user.id, "admin-1")).rejects.toMatchObject({ statusCode: 502, code: "AUTH_PASSWORD_RESET_FAILED" });

    expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
  });

  it("changes a temporary password once and clears the mandatory flag", async () => {
    mocks.findById.mockResolvedValue({ ...user, mustChangePassword: true });
    mocks.setMustChangePassword.mockResolvedValue({ ...user, mustChangePassword: false });

    const updated = await new UserService().changeTemporaryPassword(user.id, "A-new-password1!");

    expect(mocks.updateAuthUser).toHaveBeenCalledWith(user.id, { password: "A-new-password1!" });
    expect(mocks.setMustChangePassword).toHaveBeenCalledWith(user.id, false, expect.anything());
    expect(mocks.recordAudit).toHaveBeenCalledWith(user.id, "PASSWORD_CHANGED_AFTER_RESET", "USER", user.id, undefined, expect.anything());
    expect(updated.mustChangePassword).toBe(false);
  });

  it("rejects weak new passwords", () => {
    expect(() => validateNewPassword("weak-password")).toThrowError(/al menos 12 caracteres/);
  });
});
