import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  searchParams: new URLSearchParams()
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams
}));

vi.mock("../services/public-tracking.service", () => ({
  findPublicTracking: mocks.find
}));

import { PublicTrackingView } from "./public-tracking-view";

const sampleResult = {
  orderNumber: "OT-2026-00001",
  status: "IN_PROGRESS" as const,
  progress: 45,
  serviceDescription: "Pruebas técnicas en curso.",
  serviceType: "Reconstrucción",
  engineSummary: "Cummins ISX",
  receivedAt: "2026-09-01T12:00:00.000Z",
  estimatedDate: "2026-09-18",
  lastUpdatedAt: "2026-09-05T12:00:00.000Z",
  timeline: [
    {
      type: "ORDER_RECEIVED" as const,
      title: "Orden recibida",
      message: "El motor fue recibido y la orden quedó registrada.",
      progress: 0,
      occurredAt: "2026-09-01T12:00:00.000Z"
    },
    {
      type: "WORK_STARTED" as const,
      title: "Reparación iniciada",
      message: "La orden ingresó al proceso técnico.",
      progress: 0,
      occurredAt: "2026-09-02T12:00:00.000Z"
    }
  ]
};

afterEach(cleanup);

describe("PublicTrackingView", () => {
  beforeEach(() => {
    mocks.find.mockReset();
    mocks.searchParams = new URLSearchParams();
  });

  it("1. sin query params: no hace consulta automática y mantiene el comportamiento manual", () => {
    render(<PublicTrackingView />);

    expect(mocks.find).not.toHaveBeenCalled();
    const orderInput = screen.getByLabelText(/Número de orden/i) as HTMLInputElement;
    const codeInput = screen.getByLabelText(/Código de seguimiento/i) as HTMLInputElement;
    expect(orderInput.value).toBe("");
    expect(codeInput.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Consultar orden" }));
    expect(screen.getByRole("alert").textContent).toContain("Ingresa el número de orden");
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("2 y 5. con ?order=...&code=...: llena campos y consulta automáticamente una sola vez", async () => {
    mocks.searchParams = new URLSearchParams({
      order: "OT-2026-00001",
      code: "MTR-A4F6E80C2A9375FFEFAB1012"
    });
    mocks.find.mockResolvedValueOnce(sampleResult);

    render(<PublicTrackingView />);

    await waitFor(() => {
      expect(screen.getByText("OT-2026-00001")).toBeTruthy();
    });

    expect(mocks.find).toHaveBeenCalledTimes(1);
    expect(mocks.find).toHaveBeenCalledWith({
      orderNumber: "OT-2026-00001",
      trackingCode: "MTR-A4F6E80C2A9375FFEFAB1012"
    });

    expect(screen.getByText("Pruebas técnicas en curso.")).toBeTruthy();
    expect(screen.getByText("Reparación iniciada")).toBeTruthy();
    // Confirma que no se filtran datos confidenciales
    expect(screen.queryByText("Q 555.00")).toBeNull();
    expect(screen.queryByText("nota interna")).toBeNull();
  });

  it("3. con solo 'order': autocompleta el campo pero NO realiza consulta automática", () => {
    mocks.searchParams = new URLSearchParams({ order: "OT-2026-00001" });

    render(<PublicTrackingView />);

    const orderInput = screen.getByLabelText(/Número de orden/i) as HTMLInputElement;
    const codeInput = screen.getByLabelText(/Código de seguimiento/i) as HTMLInputElement;

    expect(orderInput.value).toBe("OT-2026-00001");
    expect(codeInput.value).toBe("");
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("4. con solo 'code': autocompleta el campo pero NO realiza consulta automática", () => {
    mocks.searchParams = new URLSearchParams({ code: "MTR-A4F6E80C2A9375FFEFAB1012" });

    render(<PublicTrackingView />);

    const orderInput = screen.getByLabelText(/Número de orden/i) as HTMLInputElement;
    const codeInput = screen.getByLabelText(/Código de seguimiento/i) as HTMLInputElement;

    expect(orderInput.value).toBe("");
    expect(codeInput.value).toBe("MTR-A4F6E80C2A9375FFEFAB1012");
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("6. parámetros válidos pero consulta fallida: muestra error seguro sin exponer datos internos", async () => {
    mocks.searchParams = new URLSearchParams({
      order: "OT-2026-99999",
      code: "MTR-INVALIDO0000000000000"
    });
    mocks.find.mockRejectedValueOnce(new Error("No fue posible encontrar la orden con los datos ingresados."));

    render(<PublicTrackingView />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    expect(screen.getByText("No fue posible encontrar la orden con los datos ingresados.")).toBeTruthy();
    // Los campos deben permanecer con el valor ingresado para que el usuario pueda corregirlos
    expect((screen.getByLabelText(/Número de orden/i) as HTMLInputElement).value).toBe("OT-2026-99999");
    expect((screen.getByLabelText(/Código de seguimiento/i) as HTMLInputElement).value).toBe("MTR-INVALIDO0000000000000");
  });

  it("7. botón 'Limpiar campos': restaura correctamente el estado del formulario", () => {
    render(<PublicTrackingView />);

    const orderInput = screen.getByLabelText(/Número de orden/i) as HTMLInputElement;
    const codeInput = screen.getByLabelText(/Código de seguimiento/i) as HTMLInputElement;

    fireEvent.change(orderInput, { target: { value: "OT-2026-00005" } });
    fireEvent.change(codeInput, { target: { value: "MTR-MANUAL" } });
    expect(orderInput.value).toBe("OT-2026-00005");
    expect(codeInput.value).toBe("MTR-MANUAL");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar campos" }));
    expect(orderInput.value).toBe("");
    expect(codeInput.value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
