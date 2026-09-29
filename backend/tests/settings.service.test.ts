import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings } from "../src/models/domain";

const mocks = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  clientRelease: vi.fn(),
  poolConnect: vi.fn(),
  poolQuery: vi.fn()
}));

vi.mock("../src/config/database", () => ({
  databasePool: { connect: mocks.poolConnect, query: mocks.poolQuery }
}));

import { SettingsService, settingsChanges } from "../src/services/settings.service";

const stored: AppSettings = {
  company: { name: "Motor Repair", phone: "", address: "Zona 1" },
  finance: { currency: "GTQ", taxRate: 12 }
};

const rowsFor = (settings: AppSettings) => [
  { setting_key: "company", value: settings.company },
  { setting_key: "finance", value: settings.finance }
];

// Simula PostgreSQL en memoria: lo escrito dentro de la transacción se ve en las lecturas siguientes.
const fakeDatabase = (initial: AppSettings, failOn?: string) => {
  let current = structuredClone(initial);
  mocks.clientQuery.mockImplementation((sql: string, params?: unknown[]) => {
    if (failOn && sql.includes(failOn)) return Promise.reject(new Error(`${failOn} failed`));
    if (sql.startsWith("SELECT setting_key")) return Promise.resolve({ rows: rowsFor(current) });
    if (sql.startsWith("INSERT INTO app_settings")) {
      const [key, value] = params as [keyof AppSettings, string];
      current = { ...current, [key]: JSON.parse(value) };
    }
    return Promise.resolve({ rowCount: 1, rows: [] });
  });
};

const sqlCalls = () => mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
const settingsWrites = () => mocks.clientQuery.mock.calls.filter(([sql]) => String(sql).startsWith("INSERT INTO app_settings"));
const auditWrites = () => mocks.clientQuery.mock.calls.filter(([sql]) => String(sql).startsWith("INSERT INTO audit_events"));

describe("SettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.poolConnect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.clientRelease });
  });

  it("saves and audits who changed what inside a single transaction", async () => {
    fakeDatabase(stored);
    const next: AppSettings = { company: { ...stored.company, name: "Motores López" }, finance: { ...stored.finance, taxRate: 15 } };

    const result = await new SettingsService().save(next, "admin-1");

    expect(result).toEqual(next);
    expect(sqlCalls()[0]).toBe("BEGIN");
    expect(sqlCalls()[1]).toContain("FOR UPDATE");
    expect(sqlCalls().at(-1)).toBe("COMMIT");
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
    expect(mocks.poolQuery).not.toHaveBeenCalled();

    const [[, auditParams]] = auditWrites();
    expect(auditParams.slice(0, 4)).toEqual(["admin-1", "SETTINGS_UPDATED", "SETTINGS", null]);
    expect(JSON.parse(auditParams[4])).toEqual({
      changes: {
        "company.name": { from: "Motor Repair", to: "Motores López" },
        "finance.taxRate": { from: 12, to: 15 }
      }
    });
  });

  it("rewrites only the section that changed", async () => {
    fakeDatabase(stored);

    await new SettingsService().save({ ...stored, company: { ...stored.company, phone: "5555-1234" } }, "admin-1");

    expect(settingsWrites()).toHaveLength(1);
    expect(settingsWrites()[0][1]).toEqual(["company", JSON.stringify({ name: "Motor Repair", phone: "5555-1234", address: "Zona 1" }), "admin-1"]);
    expect(JSON.parse(auditWrites()[0][1][4])).toEqual({ changes: { "company.phone": { from: "", to: "5555-1234" } } });
  });

  it("does not write nor audit when the values did not change", async () => {
    fakeDatabase(stored);

    const result = await new SettingsService().save(structuredClone(stored), "admin-1");

    expect(result).toEqual(stored);
    expect(settingsWrites()).toHaveLength(0);
    expect(auditWrites()).toHaveLength(0);
    expect(sqlCalls().at(-1)).toBe("COMMIT");
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
  });

  it("rolls back the settings update when the audit record fails", async () => {
    fakeDatabase(stored, "INSERT INTO audit_events");

    await expect(new SettingsService().save({ ...stored, finance: { currency: "USD", taxRate: 12 } }, "admin-1"))
      .rejects.toThrow("INSERT INTO audit_events failed");

    expect(settingsWrites()).toHaveLength(1);
    expect(sqlCalls()).toContain("ROLLBACK");
    expect(sqlCalls()).not.toContain("COMMIT");
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
  });

  it("does not audit and rolls back when the settings update fails", async () => {
    fakeDatabase(stored, "INSERT INTO app_settings");

    await expect(new SettingsService().save({ ...stored, finance: { currency: "USD", taxRate: 12 } }, "admin-1"))
      .rejects.toThrow("INSERT INTO app_settings failed");

    expect(auditWrites()).toHaveLength(0);
    expect(sqlCalls()).toContain("ROLLBACK");
    expect(sqlCalls()).not.toContain("COMMIT");
  });

  it("only compares contract fields, so unexpected values never reach the audit", () => {
    const withExtraKeys = { ...stored, company: { ...stored.company, apiKey: "secret-value" } } as AppSettings;
    expect(settingsChanges(stored, withExtraKeys)).toEqual({});
  });

  it("reads settings with defaults and hides unknown stored keys", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ setting_key: "company", value: { name: "Taller", legacyToken: "secret-value" } }] });

    const settings = await new SettingsService().get();

    expect(settings).toEqual({ company: { name: "Taller", phone: "", address: "" }, finance: { currency: "GTQ", taxRate: 0 } });
    expect(JSON.stringify(settings)).not.toContain("secret-value");
  });
});
