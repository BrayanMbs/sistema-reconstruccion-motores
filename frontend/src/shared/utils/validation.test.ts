import { describe, expect, it } from "vitest";
import {
  hasSqlInjectionPattern,
  hasXssPattern,
  validateEmail,
  validatePersonName,
  validateSafeText
} from "./validation";

describe("Frontend Security Validation Utils", () => {
  describe("hasSqlInjectionPattern", () => {
    it.each([
      "' OR '1'='1",
      "' OR '1'='1' --",
      '" OR "1"="1',
      "' OR 1=1 --",
      "admin' --",
      "test' /* comment */",
      "1; DROP TABLE users; --",
      "' UNION SELECT * FROM app_users --",
      "' OR 'a'='a",
      "x' AND 1=1 --",
      "SLEEP(5)",
      "0x61646d696e"
    ])("detects SQL injection pattern: %s", (payload) => {
      expect(hasSqlInjectionPattern(payload)).toBe(true);
    });

    it.each([
      "Juan Pérez",
      "María José Rodríguez",
      "Toyota Hilux 2.8L",
      "Calle 4-20, Zona 1",
      "Cambio de empaque o revisión de culata"
    ])("passes safe text: %s", (safeText) => {
      expect(hasSqlInjectionPattern(safeText)).toBe(false);
    });
  });

  describe("hasXssPattern", () => {
    it.each([
      "<script>alert(1)</script>",
      "<script src='https://evil.com/x.js'></script>",
      "<iframe src='malicious.com'></iframe>",
      "<svg onload='alert(1)'>",
      "<img src=x onerror='alert(1)'>",
      "javascript:alert(1)"
    ])("detects XSS payload: %s", (payload) => {
      expect(hasXssPattern(payload)).toBe(true);
    });
  });

  describe("validatePersonName", () => {
    it.each([
      "Juan Pérez",
      "María José Rodríguez",
      "Jean-Pierre D'Angelo",
      "Dr. Carlos M. Gómez",
      "Mefi-Boset Castañeda",
      "René O'Connor",
      "Héctor Núñez",
      "Ana Sofía"
    ])("accepts legitimate names: %s", (name) => {
      expect(validatePersonName(name)).toBeNull();
    });

    it.each([
      "' OR '1'='1",
      "123",
      "Juan 123",
      "Pedro = Gomez",
      "<script>alert(1)</script>",
      "-Juan",
      "Pedro-",
      "O''Connor",
      "Juan..Perez",
      "A",
      "   "
    ])("rejects invalid or attack names: %s", (name) => {
      const error = validatePersonName(name, "Nombre completo");
      expect(error).toBeTruthy();
      expect(typeof error).toBe("string");
    });
  });

  describe("validateSafeText", () => {
    it("rejects SQL injection and XSS in general text fields", () => {
      expect(validateSafeText("' OR '1'='1", "Descripción")).toContain("patrones de inyección");
      expect(validateSafeText("<script>alert(1)</script>", "Notas")).toContain("código o etiquetas");
      expect(validateSafeText("a\x00b", "Dirección")).toContain("caracteres no permitidos");
    });

    it("accepts safe multiline notes and descriptions", () => {
      expect(validateSafeText("Revisión de empaque\nCambio de aceite", "Descripción")).toBeNull();
    });
  });

  describe("validateEmail", () => {
    it("validates emails properly", () => {
      expect(validateEmail("usuario@example.com")).toBeNull();
      expect(validateEmail("invalid-email")).toBeTruthy();
      expect(validateEmail("user..name@domain.com")).toBeTruthy();
    });
  });
});

