import { describe, expect, it } from "vitest";
import { validateSettings } from "../src/validators/settings.validators";

const valid = () => ({
  company: { name: "Motores López", phone: "+502 5555-1234", address: "Zona 1, Ciudad de Guatemala" },
  finance: { currency: "GTQ", taxRate: 12 }
});

const validationError = { statusCode: 422, code: "VALIDATION_ERROR" };
const unexpectedField = { statusCode: 422, code: "UNEXPECTED_SETTINGS_FIELD" };

describe("settings validators", () => {
  it("accepts a complete payload and normalizes text and currency", () => {
    const payload = valid();
    payload.company.name = "  Motores López  ";
    payload.company.address = "Línea 1\r\nLínea 2";
    payload.finance.currency = " gtq ";
    expect(validateSettings(payload)).toEqual({
      company: { name: "Motores López", phone: "+502 5555-1234", address: "Línea 1\nLínea 2" },
      finance: { currency: "GTQ", taxRate: 12 }
    });
  });

  it("treats phone and address as optional", () => {
    const payload = { company: { name: "Taller" }, finance: { currency: "USD", taxRate: 0 } };
    expect(validateSettings(payload).company).toEqual({ name: "Taller", phone: "", address: "" });
  });

  it.each([null, undefined, "texto", [], { company: {} }, { finance: {} }, { company: [], finance: {} }])(
    "rejects a malformed body %#",
    (body) => {
      expect(() => validateSettings(body)).toThrowError(expect.objectContaining(validationError));
    }
  );

  it("requires the company name and limits its length", () => {
    const empty = valid(); empty.company.name = "   ";
    const long = valid(); long.company.name = "a".repeat(151);
    expect(() => validateSettings(empty)).toThrow(/Nombre comercial es obligatorio/);
    expect(() => validateSettings(long)).toThrow(/Nombre comercial supera la longitud permitida/);
  });

  it.each(["tel: 5555", "5555\n1234", "+ - ( )", "1".repeat(31)])("rejects the invalid phone %j", (phone) => {
    const payload = valid(); payload.company.phone = phone;
    expect(() => validateSettings(payload)).toThrowError(expect.objectContaining(validationError));
  });

  it("limits the address and rejects invisible control characters", () => {
    const long = valid(); long.company.address = "a".repeat(256);
    const control = valid(); control.company.name = "Taller\u0000";
    expect(() => validateSettings(long)).toThrow(/Dirección supera la longitud permitida/);
    expect(() => validateSettings(control)).toThrow(/caracteres no permitidos/);
  });

  it.each(["", "Q", "QUETZAL", "G1Q", 320])("rejects the invalid currency %j", (currency) => {
    const payload = { ...valid(), finance: { currency, taxRate: 12 } };
    expect(() => validateSettings(payload)).toThrowError(expect.objectContaining(validationError));
  });

  it.each([-1, 100.01, 12.345, Number.NaN, "12", null])("rejects the invalid tax rate %j", (taxRate) => {
    const payload = { ...valid(), finance: { currency: "GTQ", taxRate } };
    expect(() => validateSettings(payload)).toThrowError(expect.objectContaining(validationError));
  });

  it.each([0, 100, 12.5, 0.07])("accepts the tax rate %j", (taxRate) => {
    const payload = { ...valid(), finance: { currency: "GTQ", taxRate } };
    expect(validateSettings(payload).finance.taxRate).toBe(taxRate);
  });

  it("rejects unexpected fields at every level instead of storing them silently", () => {
    expect(() => validateSettings({ ...valid(), apiKey: "secret" })).toThrowError(expect.objectContaining(unexpectedField));
    expect(() => validateSettings({ ...valid(), company: { ...valid().company, password: "secret" } }))
      .toThrowError(expect.objectContaining({ ...unexpectedField, message: "Campo de configuración no permitido: company.password" }));
    expect(() => validateSettings({ ...valid(), finance: { ...valid().finance, serviceRoleKey: "secret" } }))
      .toThrowError(expect.objectContaining(unexpectedField));
  });
});
