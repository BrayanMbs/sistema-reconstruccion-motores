import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrackingShareActions } from "./tracking-share-actions";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn()
}));

vi.mock("@/shared/services/api", () => ({
  apiRequest: mocks.apiRequest
}));

afterEach(cleanup);

describe("TrackingShareActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza los botones Ver QR, Enviar por WhatsApp y Copiar enlace", () => {
    render(
      <TrackingShareActions
        orderNumber="OT-2026-00001"
        trackingCode="MTR-TEST123456"
        clientId="client-1"
        clientName="Juan Pérez"
        initialClientPhone="55551234"
      />
    );

    expect(screen.getByRole("button", { name: /Ver QR/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enviar por WhatsApp/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeTruthy();
  });

  it("abre el modal de QR al pulsar Ver QR", async () => {
    render(
      <TrackingShareActions
        orderNumber="OT-2026-00001"
        trackingCode="MTR-TEST123456"
        clientId="client-1"
        clientName="Juan Pérez"
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ver QR/i }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Orden: OT-2026-00001")).toBeTruthy();
  });

  it("copia el enlace al portapapeles y muestra confirmación al pulsar Copiar enlace", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    render(
      <TrackingShareActions
        orderNumber="OT-2026-00001"
        trackingCode="MTR-TEST123456"
        clientId="client-1"
        clientName="Juan Pérez"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Copiar enlace/i }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    expect(writeTextMock.mock.calls[0][0]).toContain("/seguimiento?order=OT-2026-00001&code=MTR-TEST123456");
    expect(await screen.findByText("Enlace copiado correctamente.")).toBeTruthy();
  });

  it("abre WhatsApp con mensaje preparado cuando el teléfono es válido", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <TrackingShareActions
        orderNumber="OT-2026-00001"
        trackingCode="MTR-TEST123456"
        clientId="client-1"
        clientName="Transportes Juan"
        initialClientPhone="55551234"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Enviar por WhatsApp/i }));
    expect(openSpy).toHaveBeenCalled();

    const openedUrl = openSpy.mock.calls[0][0] as string;
    expect(openedUrl.startsWith("https://wa.me/50255551234?text=")).toBe(true);
    expect(openedUrl).toContain("Transportes+Juan");
    expect(openedUrl).toContain("OT-2026-00001");
    expect(openedUrl).toContain("MTR-TEST123456");

    openSpy.mockRestore();
  });

  it("no abre WhatsApp y muestra mensaje de advertencia si el cliente no tiene teléfono válido", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <TrackingShareActions
        orderNumber="OT-2026-00001"
        trackingCode="MTR-TEST123456"
        clientId="client-1"
        clientName="Transportes Juan"
        initialClientPhone={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Enviar por WhatsApp/i }));
    expect(openSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText("Este cliente no tiene un número de teléfono válido registrado.")
    ).toBeTruthy();

    openSpy.mockRestore();
  });

  it("consulta el teléfono desde la API administrativa si no se proporcionó inicialmente", async () => {
    mocks.apiRequest.mockResolvedValueOnce({
      client: {
        id: "client-99",
        fullName: "Cliente Remoto",
        phone: "+502 4444-9999"
      }
    });

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <TrackingShareActions
        orderNumber="OT-2026-00099"
        trackingCode="MTR-REMOTE99"
        clientId="client-99"
        clientName="Cliente Remoto"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Enviar por WhatsApp/i }));

    await waitFor(() => {
      expect(mocks.apiRequest).toHaveBeenCalledWith("/api/administrativo/clients/client-99");
    });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });

    const openedUrl = openSpy.mock.calls[0][0] as string;
    expect(openedUrl.startsWith("https://wa.me/50244449999?text=")).toBe(true);

    openSpy.mockRestore();
  });
});
