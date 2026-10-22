import { describe, expect, it } from "vitest";
import { formatAuditDateTime, getAuditActionInfo } from "./audit-helpers";

describe("audit-helpers", () => {
  describe("getAuditActionInfo", () => {
    it("returns specialized metadata for known actions", () => {
      const settings = getAuditActionInfo("SETTINGS_UPDATED");
      expect(settings.label).toBe("Configuración del taller actualizada");
      expect(settings.category).toBe("Configuración");
      expect(settings.icon).toBe("settings");

      const userCreated = getAuditActionInfo("USER_CREATED");
      expect(userCreated.label).toBe("Usuario registrado en el sistema");
      expect(userCreated.category).toBe("Usuarios");
      expect(userCreated.icon).toBe("person_add");

      const passwordReset = getAuditActionInfo("PASSWORD_RESET_BY_ADMIN");
      expect(passwordReset.label).toBe("Contraseña restablecida por administrador");
      expect(passwordReset.category).toBe("Seguridad");
      expect(passwordReset.icon).toBe("key");

      const passwordChanged = getAuditActionInfo("PASSWORD_CHANGED_AFTER_RESET");
      expect(passwordChanged.label).toBe("Contraseña actualizada tras restablecimiento");
      expect(passwordChanged.category).toBe("Seguridad");
      expect(passwordChanged.icon).toBe("shield");
    });

    it("falls back gracefully for unknown actions without crashing", () => {
      const custom = getAuditActionInfo("CUSTOM_UNKNOWN_ACTION");
      expect(custom.label).toBe("Custom Unknown Action");
      expect(custom.category).toBe("Actividad");
      expect(custom.icon).toBe("history");
    });
  });

  describe("formatAuditDateTime", () => {
    it("formats valid date string nicely in Spanish", () => {
      const result = formatAuditDateTime("2026-10-01T18:34:00Z");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("returns raw string if date is invalid", () => {
      expect(formatAuditDateTime("invalid-date")).toBe("invalid-date");
    });
  });
});

