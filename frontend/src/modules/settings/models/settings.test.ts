import { describe, expect, it } from "vitest";
import type { SettingsForm } from "../dtos/settings.dto";
import { toSettingsForm, toSettingsPayload } from "../mappers/settings.mapper";
import { hasSettingsErrors, sameSettings, validateSettingsForm } from "./settings";

const form = (overrides: { company?: Partial<SettingsForm["company"]>; finance?: Partial<SettingsForm["finance"]> } = {}): SettingsForm => ({
  company: { name: "Motores López", phone: "+502 5555-1234", address: "Zona 1", ...overrides.company },
  finance: { currency: "GTQ", taxRate: "12", ...overrides.finance }
});

describe("settings validation", () => {
  it("accepts a valid form", () => {
    expect(validateSettingsForm(form())).toEqual({});
    expect(validateSettingsForm(form({ company: { phone: "", address: "" }, finance: { taxRate: "0" } }))).toEqual({});
    expect(validateSettingsForm(form({ finance: { taxRate: "100" } }))).toEqual({});
  });

  it("requires the company name and limits text lengths", () => {
    expect(validateSettingsForm(form({ company: { name: "   " } })).name).toBe("El nombre comercial es obligatorio.");
    expect(validateSettingsForm(form({ company: { name: "a".repeat(151) } })).name).toMatch(/150/);
    expect(validateSettingsForm(form({ company: { address: "a".repeat(256) } })).address).toMatch(/255/);
  });

  it.each(["tel: 5555", "+ - ( )", "1".repeat(31)])("rejects the phone %j", (phone) => {
    expect(validateSettingsForm(form({ company: { phone } })).phone).toBeTruthy();
  });

  it.each(["", "Q", "QUETZAL", "G1Q"])("rejects the currency %j", (currency) => {
    expect(validateSettingsForm(form({ finance: { currency } })).currency).toBeTruthy();
  });

  it.each(["", "-1", "100.01", "12.345", "abc"])("rejects the tax rate %j", (taxRate) => {
    expect(validateSettingsForm(form({ finance: { taxRate } })).taxRate).toBeTruthy();
  });

  it("reports whether there are errors", () => {
    expect(hasSettingsErrors({})).toBe(false);
    expect(hasSettingsErrors({ name: undefined })).toBe(false);
    expect(hasSettingsErrors({ name: "El nombre comercial es obligatorio." })).toBe(true);
  });
});

describe("settings mapper", () => {
  it("converts the form into a trimmed and normalized payload", () => {
    expect(toSettingsPayload(form({ company: { name: "  Taller  " }, finance: { currency: " usd ", taxRate: "15.5" } }))).toEqual({
      company: { name: "Taller", phone: "+502 5555-1234", address: "Zona 1" },
      finance: { currency: "USD", taxRate: 15.5 }
    });
  });

  it("converts saved settings back into editable form values", () => {
    const settings = { company: { name: "Taller", phone: "", address: "" }, finance: { currency: "GTQ", taxRate: 12 } };
    expect(toSettingsForm(settings)).toEqual({ company: settings.company, finance: { currency: "GTQ", taxRate: "12" } });
    expect(sameSettings(toSettingsPayload(toSettingsForm(settings)), settings)).toBe(true);
    expect(sameSettings(settings, { ...settings, finance: { currency: "GTQ", taxRate: 15 } })).toBe(false);
  });
});
