import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdministrativeDashboardView } from "./administrative-dashboard-view";

const apiRequest = vi.fn();
vi.mock("@/shared/services/api", () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe("AdministrativeDashboardView", () => {
  beforeEach(() => apiRequest.mockReset());
  it("renders operational metrics without admin-only data", async () => {
    apiRequest.mockResolvedValue({ clients: 8, orders: { total: 10, pending: 3, in_progress: 2, completed: 5, unassigned: 1 }, upcoming: [] });
    render(<AdministrativeDashboardView />);
    expect(await screen.findByText("Dashboard administrativo")).toBeTruthy();
    expect(screen.getByText("Sin asignar")).toBeTruthy();
    expect(screen.queryByText("Finanzas")).toBeNull();
    expect(apiRequest).toHaveBeenCalledWith("/api/administrativo/dashboard");
  });
});
