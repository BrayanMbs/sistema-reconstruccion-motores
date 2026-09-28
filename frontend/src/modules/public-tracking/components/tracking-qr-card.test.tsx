import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { TrackingQrCard, TrackingQrModal } from "./tracking-qr-card";

vi.spyOn(QRCode, "toDataURL");

afterEach(cleanup);

describe("TrackingQrCard & TrackingQrModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza la tarjeta con empresa, número de orden, código de respaldo y genera QR con la URL pública", async () => {
    render(
      <TrackingQrCard
        orderNumber="OT-2026-00025"
        trackingCode="MTR-A4F6E80C2A9375FFEFAB1012"
      />
    );

    expect(screen.getByText("Reconstrucción de Motores")).toBeTruthy();
    expect(screen.getByText("Orden: OT-2026-00025")).toBeTruthy();
    expect(screen.getByText("MTR-A4F6E80C2A9375FFEFAB1012")).toBeTruthy();
    expect(screen.getByText("Escanee este código para consultar el avance de su trabajo.")).toBeTruthy();

    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    const passedUrl = vi.mocked(QRCode.toDataURL).mock.calls[0][0];
    expect(passedUrl).toContain("/seguimiento?order=OT-2026-00025&code=MTR-A4F6E80C2A9375FFEFAB1012");

    // Verificar que no expone datos financieros
    expect(screen.queryByText(/total/i)).toBeNull();
    expect(screen.queryByText(/precio/i)).toBeNull();
    expect(screen.queryByText(/saldo/i)).toBeNull();
  });

  it("no muestra el modal si isOpen es false", () => {
    render(
      <TrackingQrModal
        isOpen={false}
        onClose={vi.fn()}
        orderNumber="OT-2026-00025"
        trackingCode="MTR-A4F6E80C2A9375FFEFAB1012"
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("muestra el modal con acciones de imprimir, copiar enlace y cerrar cuando isOpen es true", () => {
    const handleClose = vi.fn();
    render(
      <TrackingQrModal
        isOpen={true}
        onClose={handleClose}
        orderNumber="OT-2026-00025"
        trackingCode="MTR-A4F6E80C2A9375FFEFAB1012"
      />
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar enlace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("ejecuta window.print al hacer clic en Imprimir", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <TrackingQrModal
        isOpen={true}
        onClose={vi.fn()}
        orderNumber="OT-2026-00025"
        trackingCode="MTR-A4F6E80C2A9375FFEFAB1012"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("copia el enlace al portapapeles y muestra confirmación al hacer clic en Copiar enlace", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    render(
      <TrackingQrModal
        isOpen={true}
        onClose={vi.fn()}
        orderNumber="OT-2026-00025"
        trackingCode="MTR-A4F6E80C2A9375FFEFAB1012"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    expect(writeTextMock.mock.calls[0][0]).toContain("/seguimiento?order=OT-2026-00025&code=MTR-A4F6E80C2A9375FFEFAB1012");
    expect(await screen.findByText("Enlace copiado correctamente.")).toBeTruthy();
  });
});
