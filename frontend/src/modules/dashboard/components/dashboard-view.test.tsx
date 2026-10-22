import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardView } from "./dashboard-view";

const apiRequest = vi.fn();
vi.mock("@/shared/services/api", () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

const mockDashboardData = {
  users: { active: 10, inactive: 2 },
  clients: 15,
  orders: { total: 20, pending: 5, in_progress: 10, completed: 5 },
  recentActivity: [
    {
      id: "event-1",
      actorName: "tsebastianm",
      action: "SETTINGS_UPDATED",
      entityType: "SETTINGS",
      entityId: null,
      details: {},
      createdAt: "2026-10-01T18:34:00Z"
    },
    {
      id: "event-2",
      actorName: "tsebastianm",
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: "u2",
      details: {},
      createdAt: "2026-10-01T18:33:00Z"
    },
    {
      id: "event-3",
      actorName: "Mefi-Boset Castañeda",
      action: "PASSWORD_CHANGED_AFTER_RESET",
      entityType: "USER",
      entityId: "u3",
      details: {},
      createdAt: "2026-10-01T18:32:00Z"
    },
    {
      id: "event-4",
      actorName: "tsebastianm",
      action: "PASSWORD_RESET_BY_ADMIN",
      entityType: "USER",
      entityId: "u3",
      details: {},
      createdAt: "2026-10-01T18:31:00Z"
    }
  ]
};

describe("DashboardView", () => {
  beforeEach(() => apiRequest.mockReset());
  afterEach(cleanup);

  it("renders recent activity with friendly Spanish titles, category badges, and actor names", async () => {
    apiRequest.mockResolvedValue(mockDashboardData);

    render(<DashboardView />);

    expect(await screen.findByText("Actividad reciente")).toBeTruthy();
    expect(screen.getByText("Ver auditoría completa")).toBeTruthy();

    // Friendly Spanish titles instead of raw uppercase enums
    expect(screen.getByText("Configuración del taller actualizada")).toBeTruthy();
    expect(screen.getByText("Datos de usuario actualizados")).toBeTruthy();
    expect(screen.getByText("Contraseña actualizada tras restablecimiento")).toBeTruthy();
    expect(screen.getByText("Contraseña restablecida por administrador")).toBeTruthy();

    // Category badges
    expect(screen.getByText("Configuración")).toBeTruthy();
    expect(screen.getAllByText("Usuarios").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Seguridad").length).toBe(2);

    // Actor names
    expect(screen.getAllByText("tsebastianm").length).toBe(3);
    expect(screen.getByText("Mefi-Boset Castañeda")).toBeTruthy();
  });

  it("renders empty state message when there are no recent activity events", async () => {
    apiRequest.mockResolvedValue({
      ...mockDashboardData,
      recentActivity: []
    });

    render(<DashboardView />);

    expect(await screen.findByText("No hay eventos de auditoría registrados todavía.")).toBeTruthy();
  });

  it("renders metric cards as interactive links to filtered views", async () => {
    apiRequest.mockResolvedValue(mockDashboardData);

    render(<DashboardView />);

    expect(await screen.findByText("Panel de Control")).toBeTruthy();

    // Verify top metric links
    const activeUsersLink = screen.getByRole("link", { name: /Usuarios activos: 10/i });
    expect(activeUsersLink.getAttribute("href")).toBe("/admin/users?active=true");

    const inactiveUsersLink = screen.getByRole("link", { name: /Usuarios inactivos: 2/i });
    expect(inactiveUsersLink.getAttribute("href")).toBe("/admin/users?active=false");

    const clientsLink = screen.getByRole("link", { name: /Clientes registrados: 15/i });
    expect(clientsLink.getAttribute("href")).toBe("/admin/clients");

    const pendingOrdersMetricLink = screen.getByRole("link", { name: /Órdenes pendientes: 5/i });
    expect(pendingOrdersMetricLink.getAttribute("href")).toBe("/admin/work-orders?status=PENDING");

    // Verify order status distribution links
    const pendingOrdersLink = screen.getByTitle("Ver órdenes: Pendientes");
    expect(pendingOrdersLink.getAttribute("href")).toBe("/admin/work-orders?status=PENDING");

    const inProgressOrdersLink = screen.getByTitle("Ver órdenes: En proceso");
    expect(inProgressOrdersLink.getAttribute("href")).toBe("/admin/work-orders?status=IN_PROGRESS");

    const completedOrdersLink = screen.getByTitle("Ver órdenes: Finalizadas");
    expect(completedOrdersLink.getAttribute("href")).toBe("/admin/work-orders?status=COMPLETED");
  });
});
