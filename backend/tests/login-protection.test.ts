import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "../src/models/domain";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  findById: vi.fn(),
  auditRecord: vi.fn()
}));

vi.mock("../src/config/supabase", () => ({
  createSupabaseClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword
    }
  })
}));

vi.mock("../src/repositories/user.repository", () => ({
  UserRepository: class {
    findById = mocks.findById;
  }
}));

vi.mock("../src/services/audit.service", () => ({
  AuditService: class {
    record = mocks.auditRecord.mockResolvedValue(undefined);
  }
}));

import { AuthSecurityRepository } from "../src/repositories/auth-security.repository";
import { AuthService } from "../src/services/auth.service";
import { AppError } from "../src/utils/app-error";

const sampleUser: AppUser = {
  id: "user-123",
  fullName: "Carlos Administrador",
  email: "carlos@tallermotores.gt",
  role: "ADMIN",
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z"
};

describe("Login Protection, Account Lockout & Anti-Enumeration", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    AuthSecurityRepository.resetInMemory();
    authService = new AuthService();
  });

  describe("Successful authentication and counter reset", () => {
    it("logs in successfully and clears failed attempt counters", async () => {
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: sampleUser.id },
          session: {
            access_token: "access-token-xyz",
            refresh_token: "refresh-token-xyz",
            expires_at: 1800000000
          }
        },
        error: null
      });
      mocks.findById.mockResolvedValueOnce(sampleUser);

      const result = await authService.signIn("carlos@tallermotores.gt", "CorrectPassword123!", "192.168.1.50");

      expect(result.user).toEqual(sampleUser);
      expect(result.session.accessToken).toBe("access-token-xyz");

      // Verify audit recorded login success without passwords
      expect(mocks.auditRecord).toHaveBeenCalledWith(
        sampleUser.id,
        "AUTH_LOGIN_SUCCESS",
        "AUTH",
        sampleUser.id,
        expect.objectContaining({ email: sampleUser.email })
      );
      const auditDetails = mocks.auditRecord.mock.calls[0][4];
      expect(auditDetails.password).toBeUndefined();
    });
  });

  describe("Account enumeration prevention", () => {
    it("returns identical 401 INVALID_CREDENTIALS for wrong password vs non-existent account", async () => {
      // 1. Wrong password for existing user
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error("Invalid login credentials")
      });

      let wrongPasswordError: AppError | undefined;
      try {
        await authService.signIn("carlos@tallermotores.gt", "WrongPassword!", "10.0.0.1");
      } catch (err) {
        wrongPasswordError = err as AppError;
      }

      // 2. Non-existent account
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error("Invalid login credentials")
      });

      let nonExistentError: AppError | undefined;
      try {
        await authService.signIn("nobody@randomdomain.gt", "SomePassword123!", "10.0.0.1");
      } catch (err) {
        nonExistentError = err as AppError;
      }

      expect(wrongPasswordError).toBeDefined();
      expect(nonExistentError).toBeDefined();
      expect(wrongPasswordError.statusCode).toBe(401);
      expect(nonExistentError.statusCode).toBe(401);
      expect(wrongPasswordError.code).toBe("INVALID_CREDENTIALS");
      expect(nonExistentError.code).toBe("INVALID_CREDENTIALS");
      expect(wrongPasswordError.message).toBe("Credenciales inválidas");
      expect(nonExistentError.message).toBe("Credenciales inválidas");
    });

    it("returns 401 INVALID_CREDENTIALS when profile is inactive, preventing user state enumeration", async () => {
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: "inactive-user-id" },
          session: { access_token: "token", refresh_token: "ref", expires_at: 1 }
        },
        error: null
      });
      mocks.findById.mockResolvedValueOnce({ ...sampleUser, id: "inactive-user-id", isActive: false });

      await expect(
        authService.signIn("inactive@tallermotores.gt", "Password123!", "10.0.0.2")
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Credenciales inválidas"
      });
    });
  });

  describe("Account lockout after 5 failed attempts", () => {
    it("locks the account on the 5th failed attempt and rejects subsequent attempts with 429", async () => {
      const email = "target@tallermotores.gt";
      const ip = "192.168.1.100";

      // 4 consecutive failed attempts
      for (let i = 1; i <= 4; i++) {
        mocks.signInWithPassword.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: new Error("Invalid login credentials")
        });

        await expect(authService.signIn(email, "WrongPassword!", ip)).rejects.toMatchObject({
          statusCode: 401,
          code: "INVALID_CREDENTIALS"
        });
      }

      // 5th failed attempt -> reaches threshold
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error("Invalid login credentials")
      });

      await expect(authService.signIn(email, "WrongPassword!", ip)).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS"
      });

      // 6th attempt -> ACCOUNT_LOCKED with 429
      let lockedError: AppError | undefined;
      try {
        await authService.signIn(email, "AnyPassword!", ip);
      } catch (err) {
        lockedError = err as AppError;
      }

      expect(lockedError).toBeDefined();
      expect(lockedError.statusCode).toBe(429);
      expect(lockedError.code).toBe("ACCOUNT_LOCKED");
      expect(lockedError.message).toContain("Tu cuenta ha sido bloqueada temporalmente");
      expect(lockedError.details?.remainingSeconds).toBeGreaterThan(0);

      // Verify Supabase Auth was NOT called on the 6th attempt (preventing service exhaustion)
      expect(mocks.signInWithPassword).toHaveBeenCalledTimes(5);
    });

    it("allows immediate login after account is unlocked", async () => {
      const securityRepo = new AuthSecurityRepository();
      const email = "locked@tallermotores.gt";

      // Lock account manually
      for (let i = 0; i < 5; i++) {
        await securityRepo.recordFailedAttempt(email, "ACCOUNT", 5, 15, 15);
      }

      // Verify locked
      const statusBefore = await securityRepo.getLockStatus(email, "ACCOUNT", 5, 15);
      expect(statusBefore.isLocked).toBe(true);

      // Unlock
      await securityRepo.unlockIdentifier(email, "ACCOUNT");

      // Verify unlocked
      const statusAfter = await securityRepo.getLockStatus(email, "ACCOUNT", 5, 15);
      expect(statusAfter.isLocked).toBe(false);

      // Can sign in now
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: sampleUser.id },
          session: { access_token: "token", refresh_token: "ref", expires_at: 1 }
        },
        error: null
      });
      mocks.findById.mockResolvedValueOnce(sampleUser);

      await expect(authService.signIn(email, "CorrectPassword!", "1.2.3.4")).resolves.toBeDefined();
    });
  });

  describe("Distributed attack protection (IP Rate Limiting)", () => {
    it("blocks an IP after excessive failed attempts across multiple accounts", async () => {
      const attackerIp = "203.0.113.42";

      // Attacker tries different usernames from same IP (15 attempts)
      for (let i = 1; i <= 15; i++) {
        mocks.signInWithPassword.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: new Error("Invalid login credentials")
        });

        await expect(
          authService.signIn(`victim${i}@tallermotores.gt`, "Guess123!", attackerIp)
        ).rejects.toMatchObject({
          statusCode: 401,
          code: "INVALID_CREDENTIALS"
        });
      }

      // 16th attempt from the same IP -> blocked by IP rate limit
      let ipBlockedError: AppError | undefined;
      try {
        await authService.signIn("another_user@tallermotores.gt", "Guess123!", attackerIp);
      } catch (err) {
        ipBlockedError = err as AppError;
      }

      expect(ipBlockedError).toBeDefined();
      expect(ipBlockedError.statusCode).toBe(429);
      expect(ipBlockedError.code).toBe("IP_RATE_LIMITED");
      expect(ipBlockedError.message).toContain("desde esta dirección IP");
    });
  });

  describe("Security Audit Logging Integrity", () => {
    it("never includes passwords or tokens in audit events", async () => {
      mocks.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error("Invalid password")
      });

      const superSecretPassword = "SuperSecretPassword123!#$";
      try {
        await authService.signIn("test@tallermotores.gt", superSecretPassword, "10.0.0.5");
      } catch {
        // Expected
      }

      expect(mocks.auditRecord).toHaveBeenCalled();
      for (const call of mocks.auditRecord.mock.calls) {
        const payloadString = JSON.stringify(call);
        expect(payloadString).not.toContain(superSecretPassword);
      }
    });
  });
});
