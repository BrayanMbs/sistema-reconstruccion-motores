import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("../services/public-tracking.service", () => ({ findPublicTracking: mocks.find }));

import { PublicTrackingView } from "./public-tracking-view";

afterEach(() => cleanup());

describe("PublicTrackingView", () => {
  it("validates required inputs before making a request", () => {
    render(<PublicTrackingView />);
    fireEvent.click(screen.getByRole("button", { name: "Consultar orden" }));
    expect(screen.getByRole("alert").textContent).toContain("Ingresa el número de orden");
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("shows only the public tracking result", async () => {
    mocks.find.mockResolvedValueOnce({ orderNumber: "OT-2026-00001", status: "IN_PROGRESS", progress: 45, serviceDescription: "Pruebas técnicas en curso.", serviceType: "Reconstrucción", engineSummary: "Cummins ISX", receivedAt: "2026-09-01T12:00:00.000Z", estimatedDate: "2026-09-18", lastUpdatedAt: "2026-09-05T12:00:00.000Z", timeline: [{ type: "ORDER_RECEIVED", title: "Orden recibida", message: "El motor fue recibido y la orden quedó registrada.", progress: 0, occurredAt: "2026-09-01T12:00:00.000Z" }, { type: "WORK_STARTED", title: "Reparación iniciada", message: "La orden ingresó al proceso técnico.", progress: 0, occurredAt: "2026-09-02T12:00:00.000Z" }] });
    render(<PublicTrackingView />);
    fireEvent.change(screen.getByLabelText(/Número de orden/i), { target: { value: "OT-2026-00001" } });
    fireEvent.change(screen.getByLabelText(/Código de seguimiento/i), { target: { value: "MTR-ABCDEF0123456789ABCDEF01" } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar orden" }));
    await waitFor(() => expect(screen.getByText("OT-2026-00001")).toBeTruthy());
    expect(screen.getByText("Pruebas técnicas en curso.")).toBeTruthy();
    expect(screen.getByText("Reparación iniciada")).toBeTruthy();
    expect(screen.queryByText("Q 555.00")).toBeNull();
    expect(screen.queryByText("nota interna")).toBeNull();
  });
});
