import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkOrder, WorkOrderStatus } from "@/shared/models/admin";
import { AdministrativeOrderDetail, AdministrativeOrdersView } from "./administrative-work-orders";

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
    if (path.endsWith("/history")) return Promise.resolve({ items: [] });
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
});
