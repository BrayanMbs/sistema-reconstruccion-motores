import { describe, expect, it } from "vitest";
import { roleHome } from "./role-home";

describe("roleHome", () => {
  it("routes each implemented role to its isolated area", () => {
    expect(roleHome("ADMIN")).toBe("/admin/dashboard");
    expect(roleHome("ADMINISTRATIVE")).toBe("/administrativo/dashboard");
    expect(roleHome("OPERATOR")).toBe("/operativo/inicio");
  });
  it("does not grant unsupported roles an application area", () => { expect(roleHome("CASHIER")).toBe("/login"); });
});
