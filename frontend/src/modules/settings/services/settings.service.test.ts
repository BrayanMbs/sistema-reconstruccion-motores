import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("@/shared/services/api", () => ({ apiRequest }));

import { settingsService } from "./settings.service";

const settings = { company: { name: "Taller", phone: "", address: "" }, finance: { currency: "GTQ", taxRate: 12 } };

describe("settingsService", () => {
  beforeEach(() => {
    apiRequest.mockReset().mockResolvedValue({ settings });
  });

  it("reads the real settings endpoint", async () => {
    await expect(settingsService.get()).resolves.toEqual(settings);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/settings");
  });

  it("saves the settings with PUT and returns the stored values", async () => {
    await expect(settingsService.save(settings)).resolves.toEqual(settings);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
  });

  it("propagates backend errors to the caller", async () => {
    apiRequest.mockRejectedValueOnce(new Error("La tasa de impuesto debe ser un número entre 0 y 100"));
    await expect(settingsService.save(settings)).rejects.toThrow("La tasa de impuesto");
  });
});
