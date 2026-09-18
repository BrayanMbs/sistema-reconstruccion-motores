import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";
import { requireRole } from "../src/middlewares/auth.middleware";

const profile = (role: Role): AppUser => ({ id: "user-id", fullName: "Usuario", email: "user@example.com", role, isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" });
const authorize = (role?: Role) => {
  const request = { appUser: role ? profile(role) : undefined } as Request;
  const next = vi.fn() as NextFunction;
  requireRole("ADMINISTRATIVE")(request, {} as Response, next);
  return next.mock.calls[0]?.[0];
};

describe("administrative route authorization", () => {
  it("allows only an active authenticated ADMINISTRATIVE profile", () => { expect(authorize("ADMINISTRATIVE")).toBeUndefined(); });
  it("rejects ADMIN", () => { expect(authorize("ADMIN")).toMatchObject({ statusCode: 403, code: "INSUFFICIENT_ROLE" }); });
  it("rejects OPERATOR", () => { expect(authorize("OPERATOR")).toMatchObject({ statusCode: 403, code: "INSUFFICIENT_ROLE" }); });
  it("rejects a missing session profile", () => { expect(authorize()).toMatchObject({ statusCode: 401, code: "AUTH_REQUIRED" }); });
});
