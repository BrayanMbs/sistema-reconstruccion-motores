import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Paginated, WorkOrder } from "@/shared/models/admin";
import { WorkOrdersView } from "./work-orders-view";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn()
}));

vi.mock("@/shared/services/api", () => ({
  apiRequest: mocks.apiRequest
}));

const mockOrder: WorkOrder = {
  id: "order-admin-1",
  code: "OT-2026-00010",
  trackingCode: "MTR-ADMINTRACKING123456",
  clientId: "client-admin-1",
  clientName: "Cliente Administrador",
  engineBrand: "Cummins",
  engineModel: "ISX",
  engineSerial: "SN-999",
  serviceType: "Reconstrucción",
  description: "Reparación mayor",
  status: "IN_PROGRESS",
  progress: 50,
  assignedWorkerId: null,
  assignedWorker: null,
  estimatedDate: "2026-10-01",
  createdAt: "2026-09-01T00:00:00.000Z",
  intakeNotes: null,
  publicNote: null,
  priority: "HIGH",
  startedAt: null,
  completedAt: null,
  totalAmount: 1500
};

afterEach(cleanup);

describe("WorkOrdersView (Vista del Administrador)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiRequest.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/work-orders?")) {
        const paginated: Paginated<WorkOrder> = {
          items: [mockOrder],
          total: 1,
          page: 1,
          limit: 20
        };
        return Promise.resolve(paginated);
      }
      if (path === "/api/admin/work-orders/order-admin-1") {
        return Promise.resolve({ order: mockOrder });
      }
      if (path === "/api/admin/operators") {
        return Promise.resolve({ items: [] });
      }
      if (path === "/api/admin/inventory") {
        return Promise.resolve({ items: [] });
      }
      if (path === "/api/admin/work-orders/order-admin-1/inventory") {
        return Promise.resolve({ items: [] });
      }
      if (path.endsWith("/timeline")) {
        return Promise.resolve({ items: [] });
      }
      return Promise.resolve({ items: [] });
    });
  });

  it("permite al Administrador abrir el detalle y acceder a las opciones de seguimiento (QR, WhatsApp, copiar enlace)", async () => {
    render(<WorkOrdersView />);

    expect(await screen.findByText("Órdenes de trabajo")).toBeTruthy();
    expect(screen.getByText("OT-2026-00010")).toBeTruthy();

    const viewButton = screen.getByRole("button", { name: "Ver OT-2026-00010" });
    fireEvent.click(viewButton);

    expect(await screen.findByText("Asignación y materiales")).toBeTruthy();
    expect(screen.getByText("Seguimiento del cliente")).toBeTruthy();
    expect(screen.getByText("MTR-ADMINTRACKING123456")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ver QR/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enviar por WhatsApp/i })).toBeTruthy();
  });

  it("al registrar una orden desde el asistente del Administrador muestra la tarjeta de seguimiento con QR y WhatsApp", async () => {
    mocks.apiRequest.mockImplementation((path: string, options?: RequestInit) => {
      if (path.startsWith("/api/admin/work-orders?")) {
        return Promise.resolve({ items: [], total: 0, page: 1, limit: 20 });
      }
      if (path === "/api/admin/clients?limit=100") {
        return Promise.resolve({
          items: [{ id: "client-admin-1", fullName: "Cliente Admin", identification: "DPI-1", phone: "55551234" }],
          total: 1
        });
      }
      if (path === "/api/admin/work-orders" && options?.method === "POST") {
        return Promise.resolve({
          order: {
            ...mockOrder,
            id: "order-created-99",
            code: "OT-2026-00099",
            trackingCode: "MTR-NEWADMIN99"
          }
        });
      }
      return Promise.resolve({ items: [] });
    });

    render(<WorkOrdersView />);
    expect(await screen.findByText("Órdenes de trabajo")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nueva orden" }));
    expect(await screen.findByText("Crear nueva orden de trabajo")).toBeTruthy();

    // Paso 1: Seleccionar cliente
    fireEvent.change(screen.getByLabelText(/Cliente/i), { target: { value: "client-admin-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Paso 2: Datos del motor
    fireEvent.change(screen.getByPlaceholderText(/Ej. Toyota, Caterpillar, Cummins/i), { target: { value: "Caterpillar" } });
    fireEvent.change(screen.getByPlaceholderText(/Ej. 2KD-FTV/i), { target: { value: "C15" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Paso 3: Servicio
    fireEvent.change(screen.getByLabelText(/Tipo de servicio/i), { target: { value: "Reconstrucción" } });
    fireEvent.change(screen.getByLabelText(/Descripción de fallas o servicio/i), { target: { value: "Reconstrucción completa de motor" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Paso 4: Confirmar y registrar orden
    expect(await screen.findByText("Revisar y confirmar orden")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Registrar orden" }));

    // Vista de éxito con acceso para el cliente
    expect(await screen.findByText("Orden registrada correctamente")).toBeTruthy();
    expect(screen.getByText("OT-2026-00099")).toBeTruthy();
    expect(screen.getByText("MTR-NEWADMIN99")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ver QR/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enviar por WhatsApp/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finalizar y ver órdenes" })).toBeTruthy();
  });
});
