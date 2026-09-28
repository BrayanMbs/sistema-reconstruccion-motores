import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, buildWhatsAppUrl, normalizeWhatsAppPhone } from "./whatsapp";

describe("normalizeWhatsAppPhone", () => {
  it("normaliza un número local de 8 dígitos de Guatemala anteponiendo 502", () => {
    expect(normalizeWhatsAppPhone("55551234")).toBe("50255551234");
  });

  it("normaliza un número que ya tiene el prefijo +502 con formato internacional y caracteres especiales", () => {
    expect(normalizeWhatsAppPhone("+502 5555-1234")).toBe("50255551234");
  });

  it("mantiene el número sin duplicar 502 si ya viene con el código de país de 11 dígitos", () => {
    expect(normalizeWhatsAppPhone("50255551234")).toBe("50255551234");
  });

  it("limpia paréntesis, guiones y espacios", () => {
    expect(normalizeWhatsAppPhone("(+502) 5555 - 1234")).toBe("50255551234");
  });

  it("retorna null para valores vacíos, nulos o con solo espacios", () => {
    expect(normalizeWhatsAppPhone("")).toBeNull();
    expect(normalizeWhatsAppPhone("   ")).toBeNull();
    expect(normalizeWhatsAppPhone(null)).toBeNull();
    expect(normalizeWhatsAppPhone(undefined)).toBeNull();
  });

  it("retorna null para teléfonos malformados o de longitud inválida", () => {
    expect(normalizeWhatsAppPhone("12345")).toBeNull();
    expect(normalizeWhatsAppPhone("abcdefg")).toBeNull();
    expect(normalizeWhatsAppPhone("5555-ABCD")).toBeNull();
    expect(normalizeWhatsAppPhone("1234567890123456789")).toBeNull();
  });
});

describe("buildWhatsAppMessage", () => {
  it("construye el mensaje respetando la estructura requerida sin datos sensibles", () => {
    const message = buildWhatsAppMessage({
      clientName: "Transportes Unidos",
      orderNumber: "OT-2026-00025",
      trackingUrl: "https://motores.com/seguimiento?order=OT-2026-00025&code=MTR-ABC123",
      trackingCode: "MTR-ABC123"
    });

    expect(message).toContain("Hola, Transportes Unidos.");
    expect(message).toContain("Su orden de trabajo OT-2026-00025 ya puede consultarse en línea.");
    expect(message).toContain("Puede revisar el avance de su trabajo en el siguiente enlace:");
    expect(message).toContain("https://motores.com/seguimiento?order=OT-2026-00025&code=MTR-ABC123");
    expect(message).toContain("Código de seguimiento:");
    expect(message).toContain("MTR-ABC123");
    expect(message).toContain("Gracias.");

    // Verifica que no existan datos financieros ni tokens
    expect(message).not.toContain("Total");
    expect(message).not.toContain("Saldo");
    expect(message).not.toContain("Q ");
  });

  it("asigna un nombre de cliente predeterminado si viene vacío", () => {
    const message = buildWhatsAppMessage({
      clientName: "",
      orderNumber: "OT-2026-00001",
      trackingUrl: "https://motores.com/seguimiento?order=OT-2026-00001&code=MTR-9999",
      trackingCode: "MTR-9999"
    });

    expect(message).toContain("Hola, Estimado cliente.");
  });
});

describe("buildWhatsAppUrl", () => {
  it("genera la URL oficial wa.me con el número normalizado y el mensaje codificado", () => {
    const message = "Hola, Juan.\nOrden: OT-1";
    const url = buildWhatsAppUrl("+502 5555-1234", message);

    expect(url.startsWith("https://wa.me/50255551234?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent(message).replace(/%20/g, "+"));
  });

  it("retorna string vacío si el número de teléfono es inválido", () => {
    const url = buildWhatsAppUrl("invalido", "Mensaje");
    expect(url).toBe("");
  });
});
