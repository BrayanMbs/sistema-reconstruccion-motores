import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/utils/app-error";
import { UserService } from "../src/services/user.service";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createProfile: vi.fn(),
  recordAudit: vi.fn(),
  createAuthUser: vi.fn(),
  listAuthUsers: vi.fn(),
  updateAuthUser: vi.fn(),
  deleteAuthUser: vi.fn()
}));

vi.mock("../src/repositories/user.repository", () => ({
  UserRepository: class {
    findByEmail = mocks.findByEmail;
    create = mocks.createProfile;
  }
}));

vi.mock("../src/services/audit.service", () => ({ AuditService: class { record = mocks.recordAudit; } }));
vi.mock("../src/config/supabase", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: {
    createUser: mocks.createAuthUser,
    listUsers: mocks.listAuthUsers,
    updateUserById: mocks.updateAuthUser,
    deleteUser: mocks.deleteAuthUser
  } } })
}));

const input = { fullName: "Usuario Prueba", email: "nuevo@example.com", password: "password123", role: "ADMINISTRATIVE" as const };
const profile = { id: "auth-1", fullName: input.fullName, email: input.email, role: input.role, isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

describe("UserService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByEmail.mockResolvedValue(null);
    mocks.createProfile.mockResolvedValue(profile);
    mocks.recordAudit.mockResolvedValue(undefined);
  });

  it("creates Auth and profile records for a new email", async () => {
    mocks.createAuthUser.mockResolvedValue({ data: { user: { id: "auth-1", email: input.email } }, error: null });
    await expect(new UserService().create(input, "admin-1")).resolves.toEqual(profile);
    expect(mocks.createProfile).toHaveBeenCalledWith(expect.objectContaining({ id: "auth-1", email: input.email }));
    expect(mocks.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("repairs an Auth user that has no app_users profile", async () => {
    mocks.createAuthUser.mockResolvedValue({ data: { user: null }, error: { message: "A user with this email address has already been registered" } });
    mocks.listAuthUsers.mockResolvedValue({ data: { users: [{ id: "auth-1", email: input.email }] }, error: null });
    mocks.updateAuthUser.mockResolvedValue({ data: {}, error: null });
    await expect(new UserService().create(input, "admin-1")).resolves.toEqual(profile);
    expect(mocks.updateAuthUser).toHaveBeenCalledWith("auth-1", { password: input.password, email_confirm: true });
    expect(mocks.createProfile).toHaveBeenCalledWith(expect.objectContaining({ id: "auth-1", role: "ADMINISTRATIVE" }));
    expect(mocks.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("rejects an email that already has an application profile", async () => {
    mocks.findByEmail.mockResolvedValue(profile);
    await expect(new UserService().create(input, "admin-1")).rejects.toMatchObject<Partial<AppError>>({ statusCode: 409, code: "USER_ALREADY_EXISTS" });
    expect(mocks.createAuthUser).not.toHaveBeenCalled();
  });
});
