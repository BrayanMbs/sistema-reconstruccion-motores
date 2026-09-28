import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  summary: vi.fn(), orders: vi.fn(), clients: vi.fn(), inventory: vi.fn(), movements: vi.fn(), finance: vi.fn()
}));
vi.mock("../services/reports.service", () => ({ reportsService: mocks }));

import { ReportsView } from "./reports-view";

const summary = {
  orders: { PENDING: 2, IN_PROGRESS: 3, COMPLETED: 4, CANCELLED: 1 },
  inventory: { total: 12, low_stock: 2 }, finance: { total: 1500, payments: 5 },
  assignments: { total: 10, assigned: 8 },
  scope: { startDate: null, endDate: null, status: null, inventoryIsCurrentState: true }
};
const order = {
  id: "order-1", code: "OT-2026-00001", clientId: "client-1", clientName: "Cliente real",
  engineBrand: "Cummins", engineModel: "X15", serviceType: "Reconstrucción", status: "PENDING",
  progress: 20, priority: "HIGH", assignedWorker: "Técnico", estimatedDate: null,
  createdAt: "2026-01-10T00:00:00.000Z", completedAt: null, totalAmount: 2000,
  totalPaid: 500, balance: 1500, financialStatus: "PARTIAL"
};
const emptyPage = { items: [], total: 0, page: 1, limit: 20 };
const orderPage = (page = 1) => ({ items: [order], total: 30, page, limit: 20 });

describe("ReportsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.summary.mockResolvedValue(summary);
    mocks.orders.mockResolvedValue(emptyPage);
    mocks.clients.mockResolvedValue(emptyPage);
    mocks.inventory.mockResolvedValue(emptyPage);
    mocks.movements.mockResolvedValue(emptyPage);
    mocks.finance.mockResolvedValue(emptyPage);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("renders loading first and then the successful real summary", async () => {
    let resolveSummary!: (value: typeof summary) => void;
    mocks.summary.mockReturnValue(new Promise((resolve) => { resolveSummary = resolve; }));
    render(<ReportsView />);
    expect(screen.getByText("Cargando resumen de reportes...")).toBeTruthy();
    await act(async () => resolveSummary(summary));
    expect(await screen.findByText("Q 1,500.00")).toBeTruthy();
    expect(screen.getByText("Estado actual · 12 artículos")).toBeTruthy();
  });

  it("shows an understandable error and retries the failed resource", async () => {
    mocks.summary.mockRejectedValueOnce(new Error("technical database detail"));
    render(<ReportsView />);
    expect(await screen.findByText("No fue posible cargar el resumen.")).toBeTruthy();
    expect(screen.queryByText("technical database detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Q 1,500.00")).toBeTruthy();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state without losing filters", async () => {
    render(<ReportsView />);
    expect(await screen.findByText("No hay resultados para mostrar.")).toBeTruthy();
    expect(screen.getByLabelText("Búsqueda")).toBeTruthy();
  });

  it("loads only the active detail section and changes tabs", async () => {
    render(<ReportsView />);
    await waitFor(() => expect(mocks.orders).toHaveBeenCalledTimes(1));
    expect(mocks.clients).not.toHaveBeenCalled();
    expect(mocks.finance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Clientes" }));
    await waitFor(() => expect(mocks.clients).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("tab", { name: "Finanzas" }));
    await waitFor(() => expect(mocks.finance).toHaveBeenCalledTimes(1));
  });

  it("debounces text search and sends only the final value", async () => {
    vi.useFakeTimers();
    render(<ReportsView />);
    await act(async () => Promise.resolve());
    const input = screen.getByLabelText("Búsqueda");
    fireEvent.change(input, { target: { value: "O" } });
    fireEvent.change(input, { target: { value: "OT" } });
    fireEvent.change(input, { target: { value: "OT-1" } });
    expect(mocks.orders).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve(); });
    expect(mocks.orders).toHaveBeenCalledTimes(2);
    expect(mocks.orders).toHaveBeenLastCalledWith(expect.objectContaining({ search: "OT-1", page: 1 }));
  });

  it("uses server pagination and resets to page one when a filter changes", async () => {
    mocks.orders.mockImplementation((filters: { page: number }) => Promise.resolve(orderPage(filters.page)));
    render(<ReportsView />);
    expect(await screen.findByText("OT-2026-00001")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(mocks.orders).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    fireEvent.change(screen.getAllByLabelText("Estado de orden")[1], { target: { value: "COMPLETED" } });
    await waitFor(() => expect(mocks.orders).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: "COMPLETED" })));
  });

  it("does not show stale rows while a new filtered request is loading", async () => {
    mocks.orders.mockResolvedValueOnce(orderPage());
    render(<ReportsView />);
    expect(await screen.findByText("Cliente real")).toBeTruthy();
    mocks.orders.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.change(screen.getAllByLabelText("Estado de orden")[1], { target: { value: "COMPLETED" } });
    await waitFor(() => expect(screen.queryByText("Cliente real")).toBeNull());
    expect(screen.getByText("Cargando resultados...")).toBeTruthy();
  });
});

