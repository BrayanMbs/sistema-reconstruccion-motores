import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPublicTrackingUrl } from "./tracking-link";

describe("buildPublicTrackingUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it("genera la URL relativa cuando el origen es explícitamente vacío", () => {
    const result = buildPublicTrackingUrl("OT-2026-00001", "MTR-A4F6E80C2A9375FFEFAB1012", "");
    expect(result).toBe("/seguimiento?order=OT-2026-00001&code=MTR-A4F6E80C2A9375FFEFAB1012");
  });

  it("utiliza window.location.origin en el navegador cuando no se pasa origen", () => {
    const result = buildPublicTrackingUrl("OT-2026-00001", "MTR-A4F6E80C2A9375FFEFAB1012");
    expect(result).toBe(`${window.location.origin}/seguimiento?order=OT-2026-00001&code=MTR-A4F6E80C2A9375FFEFAB1012`);
  });

  it("genera la URL absoluta usando el origen explícito", () => {
    const result = buildPublicTrackingUrl(
      "OT-2026-00001",
      "MTR-A4F6E80C2A9375FFEFAB1012",
      "https://motores.ejemplo.com"
    );
    expect(result).toBe(
      "https://motores.ejemplo.com/seguimiento?order=OT-2026-00001&code=MTR-A4F6E80C2A9375FFEFAB1012"
    );
  });

  it("normaliza barras finales en el origen", () => {
    const result = buildPublicTrackingUrl(
      "OT-2026-00001",
      "MTR-A4F6E80C2A9375FFEFAB1012",
      "https://motores.ejemplo.com///"
    );
    expect(result).toBe(
      "https://motores.ejemplo.com/seguimiento?order=OT-2026-00001&code=MTR-A4F6E80C2A9375FFEFAB1012"
    );
  });

  it("escapa correctamente caracteres especiales en número de orden y código", () => {
    const result = buildPublicTrackingUrl(
      "OT 2026/01",
      "MTR-A4&B=1",
      "https://motores.ejemplo.com"
    );
    expect(result).toBe(
      "https://motores.ejemplo.com/seguimiento?order=OT+2026%2F01&code=MTR-A4%26B%3D1"
    );
  });

  it("utiliza NEXT_PUBLIC_APP_URL si está definido en el entorno", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.produccion.com";
    const result = buildPublicTrackingUrl("OT-2026-00002", "MTR-9999");
    expect(result).toBe("https://app.produccion.com/seguimiento?order=OT-2026-00002&code=MTR-9999");
  });

  it("elimina espacios en blanco accidentales en orden y código", () => {
    const result = buildPublicTrackingUrl(
      "  OT-2026-00003  ",
      "  MTR-123456  ",
      "https://motores.com"
    );
    expect(result).toBe("https://motores.com/seguimiento?order=OT-2026-00003&code=MTR-123456");
  });
});
