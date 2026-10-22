import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  hasControlCharacters,
  optionalPhone,
  optionalText,
  requireAlphaNumericCode,
  requireEmail,
  requireIdentification,
  requirePersonName,
  requirePhone,
  requirePositiveNumber,
  requireText,
  requireUuid,
  sanitizeSearchQuery,
  sanitizeText
} from "../src/validators/common.validators";

describe("Secure Text and Input Validation", () => {
  describe("Unicode NFC normalization and trimming", () => {
    it("normalizes decomposed Unicode characters to NFC", () => {
      // Decomposed 'e' + combining acute accent (\u0065\u0301) -> precomposed 'é' (\u00e9)
      const decomposed = "P\u0065\u0301rez";
      const result = requireText(decomposed, "Nombre");
      expect(result).toBe("Pérez");
      expect(result.normalize("NFC")).toBe(result);
    });

    it("trims outer whitespace while preserving internal legitimate spacing", () => {
      const input = "   Toyota   Hilux   2.8   ";
      const result = requireText(input, "Motor");
      expect(result).toBe("Toyota   Hilux   2.8");
    });

    it("normalizes CRLF to LF in multiline mode", () => {
      const multiline = "Línea 1\r\nLínea 2\r\nLínea 3";
      const result = requireText(multiline, "Notas", 1000, { allowMultiline: true });
      expect(result).toBe("Línea 1\nLínea 2\nLínea 3");
    });

    it("handles optionalText returning null for empty or nullish values", () => {
      expect(optionalText(undefined, "Notas")).toBeNull();
      expect(optionalText(null, "Notas")).toBeNull();
      expect(optionalText("", "Notas")).toBeNull();
      expect(optionalText("  Alguna nota  ", "Notas")).toBe("Alguna nota");
    });

    it("sanitizes text with sanitizeText helper", () => {
      expect(sanitizeText("  Toyota \r\n Hilux  ", { allowMultiline: true })).toBe("Toyota \n Hilux");
      expect(sanitizeText("  Toyota   Hilux  ")).toBe("Toyota   Hilux");
    });
  });

  describe("Control character rejection", () => {
    it.each([
      "Taller\u0000",
      "Motor\x08",
      "Texto\x1F",
      "Dato\x7F",
      "Inyección\x01SQL"
    ])("rejects single-line text with illegal control char %j", (invalidText) => {
      expect(() => requireText(invalidText, "Campo")).toThrow(/caracteres no permitidos/);
    });

    it("rejects newline characters in single-line mode", () => {
      expect(() => requireText("Juan\nPérez", "Nombre")).toThrow(/caracteres no permitidos/);
      expect(() => requireText("Admin\r\nUser", "Nombre")).toThrow(/caracteres no permitidos/);
    });

    it("allows newlines and tabs in multiline mode, but rejects null bytes and control chars", () => {
      const validNotes = "Diagnóstico:\n- Rectificación de culata\n- Cambio de sellos\t(urgente)";
      expect(requireText(validNotes, "Notas", 1000, { allowMultiline: true })).toBe(validNotes);

      const invalidNotes = "Diagnóstico:\n\u0000Corrupto";
      expect(() => requireText(invalidNotes, "Notas", 1000, { allowMultiline: true })).toThrow(/caracteres no permitidos/);
    });

    it("correctly identifies control characters via helper", () => {
      expect(hasControlCharacters("Hello")).toBe(false);
      expect(hasControlCharacters("Hello\0")).toBe(true);
      expect(hasControlCharacters("Hello\n", false)).toBe(true);
      expect(hasControlCharacters("Hello\n", true)).toBe(false);
      expect(hasControlCharacters("Hello\t", true)).toBe(false);
      expect(hasControlCharacters("Hello\x1b", true)).toBe(true);
    });
  });

  describe("Legitimate Spanish and engine specification characters", () => {
    it("accepts Spanish letters, accents, diéresis and punctuation", () => {
      const text = "Reparación de cigüeñal, pistones y válvulas: ¿está listo? ¡Sí, 100%!";
      expect(requireText(text, "Descripción", 500, { allowMultiline: true })).toBe(text);
    });

    it("accepts complex automotive engine codes and designations", () => {
      const engines = [
        "1KD-FTV 3.0L D-4D",
        "ISX15 600 EPA 2010",
        "OM 457 LA 12.0L",
        "PowerStroke 6.7L V8 Turbo Diesel",
        "Detroit DD15 / DT12"
      ];
      for (const engine of engines) {
        expect(requireText(engine, "Modelo")).toBe(engine);
      }
    });
  });

  describe("Strict Email validation", () => {
    it("accepts valid standard email addresses and converts to lowercase", () => {
      expect(requireEmail("Admin@TallerMotores.gt")).toBe("admin@tallermotores.gt");
      expect(requireEmail("usuario.operativo+taller@dominio.com.gt")).toBe("usuario.operativo+taller@dominio.com.gt");
    });

    it.each([
      "not-an-email",
      "user@",
      "@domain.com",
      "user@domain",
      "user..name@domain.com",
      "user name@domain.com",
      "user@domain..com",
      "user\x00@domain.com"
    ])("rejects invalid email address: %s", (invalidEmail) => {
      expect(() => requireEmail(invalidEmail)).toThrow(/Correo no válido|caracteres no permitidos/);
    });
  });

  describe("Strict Phone validation", () => {
    it("accepts valid national and international phone numbers", () => {
      expect(requirePhone("+502 2345-6789")).toBe("+502 2345-6789");
      expect(requirePhone("5555-1234")).toBe("5555-1234");
      expect(requirePhone("(502) 2345.6789")).toBe("(502) 2345.6789");
      expect(optionalPhone(null)).toBeNull();
      expect(optionalPhone("")).toBeNull();
    });

    it.each([
      "phone: 1234",
      "abcdefgh",
      "+ - ( ) .",
      "123", // too short (< 7 chars)
      "+502 5555 1234\x00"
    ])("rejects malformed phone number: %s", (invalidPhone) => {
      expect(() => requirePhone(invalidPhone)).toThrow();
    });
  });

  describe("Identification validation (DPI / NIT / Pasaporte)", () => {
    it("accepts valid Guatemalan DPI, NIT and Passport formats", () => {
      expect(requireIdentification("2540 12345 0101")).toBe("2540 12345 0101"); // DPI
      expect(requireIdentification("1234567-8")).toBe("1234567-8"); // NIT
      expect(requireIdentification("A12345678")).toBe("A12345678"); // Passport
      expect(requireIdentification("123")).toBe("123"); // legacy short ID
    });

    it.each([
      "",
      " ",
      "   ",
      "@#!$%",
      "ID\0Bad",
      "A" // too short (< 2 chars)
    ])("rejects invalid identification: %j", (invalidId) => {
      expect(() => requireIdentification(invalidId)).toThrow();
    });
  });

  describe("Alphanumeric Code validation", () => {
    it("accepts valid codes (SKU, inventory code, order code)", () => {
      expect(requireAlphaNumericCode("REP-CUL-001")).toBe("REP-CUL-001");
      expect(requireAlphaNumericCode("OT-2026-00010")).toBe("OT-2026-00010");
      expect(requireAlphaNumericCode("PART_123.A")).toBe("PART_123.A");
    });

    it.each([
      "REP 001",
      "CODE<SCRIPT>",
      "SKU/../../bad", // contains slashes but not clean code pattern if we restrict
      "CODE;DROP TABLE"
    ])("rejects codes with forbidden characters: %s", (invalidCode) => {
      expect(() => requireAlphaNumericCode(invalidCode)).toThrow();
    });
  });

  describe("SQL Injection and XSS pattern rejection in text inputs", () => {
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
    ])("rejects SQL injection payload in requireText: %s", (payload) => {
      expect(() => requireText(payload, "Nombre")).toThrow(/patrones no permitidos/);
    });

    it.each([
      "<script>alert(1)</script>",
      "<script src='https://evil.com/x.js'></script>",
      "<iframe src='malicious.com'></iframe>",
      "<svg onload='alert(1)'>",
      "<img src=x onerror='alert(1)'>",
      "javascript:alert(1)"
    ])("rejects XSS payload in requireText: %s", (payload) => {
      expect(() => requireText(payload, "Descripción")).toThrow(/código o etiquetas no permitidas/);
    });

    it("allows complex passwords with special characters when allowRawText is true", () => {
      const complexPassword = "MyP@ssw0rd!' OR '1'='1;--";
      expect(requireText(complexPassword, "Contraseña", 128, { allowRawText: true })).toBe(complexPassword);
    });
  });

  describe("Person Name validation (requirePersonName)", () => {
    it.each([
      "Juan Pérez",
      "María José Rodríguez",
      "Jean-Pierre D'Angelo",
      "Dr. Carlos M. Gómez",
      "Mefi-Boset Castañeda",
      "René O'Connor",
      "Héctor Núñez",
      "Ana Sofía",
      "Stéphane M'Bia"
    ])("accepts valid person names: %s", (name) => {
      expect(requirePersonName(name, "Nombre")).toBe(name);
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
      "   ",
      "Juan; DROP TABLE"
    ])("rejects invalid or malicious person names: %s", (name) => {
      expect(() => requirePersonName(name, "Nombre")).toThrow();
    });
  });

  describe("Search Query sanitization and validation", () => {
    it("accepts normal search terms", () => {
      expect(sanitizeSearchQuery("Toyota Hilux")).toBe("Toyota Hilux");
      expect(sanitizeSearchQuery("Carlos")).toBe("Carlos");
      expect(sanitizeSearchQuery("")).toBeUndefined();
      expect(sanitizeSearchQuery(undefined)).toBeUndefined();
    });

    it("rejects search terms with SQL injection or control characters", () => {
      expect(() => sanitizeSearchQuery("' OR '1'='1")).toThrow(/patrones no permitidos/);
      expect(() => sanitizeSearchQuery("admin' --")).toThrow(/patrones no permitidos/);
      expect(() => sanitizeSearchQuery("test\0")).toThrow(/patrones no permitidos/);
    });
  });

  describe("XSS Prevention via escapeHtml", () => {
    it("escapes dangerous HTML characters safely", () => {
      const malicious = '<script>alert("XSS & theft")</script>\' OR 1=1 --';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain("<script>");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&#39;");
      expect(escaped).toContain("&amp;");
    });
  });

  describe("Length and type validations", () => {
    it("rejects non-string values for required text", () => {
      expect(() => requireText(12345, "Campo")).toThrow(/es obligatorio/);
      expect(() => requireText(null, "Campo")).toThrow(/es obligatorio/);
      expect(() => requireText(undefined, "Campo")).toThrow(/es obligatorio/);
      expect(() => requireText({}, "Campo")).toThrow(/es obligatorio/);
    });

    it("rejects strings exceeding maximum length", () => {
      const tooLong = "a".repeat(256);
      expect(() => requireText(tooLong, "Campo", 255)).toThrow(/supera la longitud permitida/);
    });

    it("rejects non-positive or non-finite numbers", () => {
      expect(() => requirePositiveNumber(0, "Monto")).toThrow(/debe ser un número mayor que cero/);
      expect(() => requirePositiveNumber(-50, "Monto")).toThrow(/debe ser un número mayor que cero/);
      expect(() => requirePositiveNumber(NaN, "Monto")).toThrow(/debe ser un número mayor que cero/);
      expect(() => requirePositiveNumber(Infinity, "Monto")).toThrow(/debe ser un número mayor que cero/);
      expect(requirePositiveNumber(150.50, "Monto")).toBe(150.50);
    });

    it("validates UUIDs correctly", () => {
      expect(requireUuid("a4c71ea9-6fd6-4531-b27e-6ea8fe0fbad3", "ID")).toBe("a4c71ea9-6fd6-4531-b27e-6ea8fe0fbad3");
      expect(() => requireUuid("not-a-uuid", "ID")).toThrow(/no es válido/);
    });
  });
});
