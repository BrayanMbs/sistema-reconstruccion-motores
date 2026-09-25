import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderTimeline } from "./order-timeline";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/shared/services/api", () => ({ apiRequest: apiRequestMock }));

describe("OrderTimeline", () => {
  beforeEach(() => apiRequestMock.mockReset());
  afterEach(cleanup);

  it("renders normalized events in the order returned by the backend", async () => {
    apiRequestMock.mockResolvedValue({ items: [
      { id: "created", type: "ORDER_CREATED", title: "Orden creada", description: null, occurredAt: "2026-09-25T08:00:00.000Z", actor: null, progress: null },
      { id: "complete", type: "WORK_COMPLETED", title: "Orden finalizada", description: "Trabajo finalizado", occurredAt: "2026-09-25T10:00:00.000Z", actor: { id: "operator", name: "Carlos" }, progress: 100 }
    ] });
    render(<OrderTimeline endpoint="/api/admin/work-orders/order/timeline" />);
    await screen.findByText("Orden creada");
    const titles = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(titles).toEqual(["Orden creada", "Orden finalizada"]);
    expect(screen.getByText("Avance: 100%")).toBeTruthy();
  });

  it("shows empty and retry states", async () => {
    apiRequestMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ items: [] });
    render(<OrderTimeline endpoint="/api/admin/work-orders/order/timeline" />);
    expect((await screen.findByRole("alert")).textContent).toContain("No fue posible cargar el historial de la orden.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByText("No hay actividad registrada para esta orden.")).toBeTruthy());
  });
});
