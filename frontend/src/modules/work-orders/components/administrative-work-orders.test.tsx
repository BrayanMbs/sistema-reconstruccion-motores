import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkOrder, WorkOrderStatus } from "@/shared/models/admin";
import { AdministrativeOrderDetail, AdministrativeOrderForm, AdministrativeOrdersView } from "./administrative-work-orders";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/shared/services/api", () => ({ apiRequest: apiRequestMock }));

const order = (status: WorkOrderStatus, assigned: boolean): WorkOrder => ({
  id: "order-1", code: "OT-2026-00001", trackingCode: "MTR-TEST", clientId: "client-1", clientName: "Cliente prueba",
  engineBrand: "Toyota", engineModel: "1HZ", engineSerial: null, serviceType: "Reconstrucción", description: "Prueba",
  status, progress: status === "COMPLETED" ? 100 : 25, assignedWorkerId: assigned ? "operator-1" : null,
  assignedWorker: assigned ? "Operador prueba" : null, estimatedDate: null, createdAt: "2026-01-01T00:00:00.000Z",
  intakeNotes: null, publicNote: null, priority: "NORMAL", startedAt: null,
  completedAt: status === "COMPLETED" ? "2026-01-02T00:00:00.000Z" : null,
  totalAmount: null
});

const mockDetail = (status: WorkOrderStatus, assigned: boolean) => {
  const workOrder = order(status, assigned);
  apiRequestMock.mockImplementation((path: string) => {
    if (path.endsWith("/timeline")) return Promise.resolve({ items: [] });
    if (path === "/api/administrativo/operators") return Promise.resolve({ items: [] });
    return Promise.resolve({ order: workOrder });
  });
};

describe("AdministrativeOrdersView capabilities", () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
  });

  it("does not expose inventory or technical-progress actions", async () => {
    render(<AdministrativeOrdersView />);
    expect(await screen.findByText("Órdenes de trabajo")).toBeTruthy();
    expect(screen.queryByText(/inventario/i)).toBeNull();
    expect(screen.queryByText(/actualizar progreso/i)).toBeNull();
    expect(screen.queryByText(/iniciar trabajo/i)).toBeNull();
    expect(screen.queryByText(/completar orden/i)).toBeNull();
  });

  it("shows Asignar for a PENDING unassigned order", async () => {
    mockDetail("PENDING", false);
    render(<AdministrativeOrderDetail id="order-1" />);
    expect(await screen.findByRole("button", { name: "Asignar" })).toBeTruthy();
  });

  it("shows Reasignar for an IN_PROGRESS assigned order", async () => {
    mockDetail("IN_PROGRESS", true);
    render(<AdministrativeOrderDetail id="order-1" />);
    expect(await screen.findByRole("button", { name: "Reasignar" })).toBeTruthy();
  });

  it.each(["COMPLETED", "CANCELLED"] as const)("hides assignment actions and panel for a %s order", async (status) => {
    mockDetail(status, true);
    render(<AdministrativeOrderDetail id="order-1" assignInitially />);
    expect(await screen.findByText("Cliente prueba")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(Asignar|Reasignar)$/ })).toBeNull();
    expect(screen.queryByText("Personal operativo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar asignación" })).toBeNull();
  });

  it("muestra la sección de seguimiento del cliente con código y acciones en el detalle de la orden", async () => {
    mockDetail("IN_PROGRESS", true);
    render(<AdministrativeOrderDetail id="order-1" />);

    expect(await screen.findByText("Seguimiento del cliente")).toBeTruthy();
    expect(screen.getByText("MTR-TEST")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ver QR/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enviar por WhatsApp/i })).toBeTruthy();
  });

  it("muestra la confirmación de creación con código de seguimiento y acciones para el cliente", async () => {
    apiRequestMock.mockImplementation((path: string, options?: RequestInit) => {
      if (path === "/api/administrativo/clients?limit=100") {
        return Promise.resolve({
          items: [{ id: "client-1", fullName: "Cliente Uno", identification: "DPI-1", phone: "55551234" }],
          total: 1
        });
      }
      if (path === "/api/administrativo/work-orders" && options?.method === "POST") {
        return Promise.resolve({
          order: {
            id: "order-99",
            code: "OT-2026-00099",
            trackingCode: "MTR-NEW99",
            clientId: "client-1",
            clientName: "Cliente Uno",
            status: "PENDING",
            priority: "NORMAL"
          }
        });
      }
      return Promise.resolve({ items: [] });
    });

    const { fireEvent: fe } = await import("@testing-library/react");
    render(<AdministrativeOrderForm />);
    expect(await screen.findByText("Nueva orden de trabajo")).toBeTruthy();

    fe.change(screen.getByLabelText(/Cliente/i), { target: { value: "client-1" } });
    fe.change(screen.getByLabelText(/Marca del motor/i), { target: { value: "Toyota" } });
    fe.change(screen.getByLabelText(/Modelo del motor/i), { target: { value: "1HZ" } });
    fe.change(screen.getByLabelText(/Tipo de servicio/i), { target: { value: "Reconstrucción" } });
    fe.change(screen.getByLabelText(/Descripción/i), { target: { value: "Falla motor" } });

    fe.click(screen.getByRole("button", { name: "Registrar orden" }));

    expect(await screen.findByText("Orden registrada correctamente")).toBeTruthy();
    expect(screen.getByText("OT-2026-00099")).toBeTruthy();
    expect(screen.getByText("MTR-NEW99")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ver QR/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enviar por WhatsApp/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Asignar trabajador/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver órdenes/i })).toBeTruthy();
  });
});
