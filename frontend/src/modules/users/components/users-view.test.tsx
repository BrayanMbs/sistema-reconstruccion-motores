import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersView } from "./users-view";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/shared/services/api", () => ({ apiRequest: apiRequestMock }));

const user = { id: "user-1", fullName: "Ana Pérez", email: "ana@example.com", role: "ADMINISTRATIVE" as const, isActive: true, mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("UsersView mobile actions", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/users?")) return Promise.resolve({ items: [user], total: 1, page: 1, limit: 20 });
      if (path === "/api/admin/users/user-1/reset-password") return Promise.resolve({ temporaryPassword: "Temp1234" });
      if (path === "/api/admin/users/user-1/status") return Promise.resolve({ user: { ...user, isActive: false } });
      return Promise.resolve({});
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("exposes mobile actions through a visible options control and keeps reset endpoint", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    const reset = screen.getByRole("button", { name: "Restablecer contraseña" });
    expect(reset).toBeTruthy();
    fireEvent.click(reset);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users/user-1/reset-password", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText("Contraseña temporal generada")).toBeTruthy();
  });

  it("keeps status and edit flows available from mobile options", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Inactivar usuario" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users/user-1/status", expect.objectContaining({ method: "PATCH" })));
    fireEvent.click(screen.getByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar usuario" }));
    expect(await screen.findByRole("heading", { name: "Editar usuario" })).toBeTruthy();
  });

  it("toggles the temporary password only when creating a user", async () => {
    render(<UsersView />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const password = screen.getByLabelText("Contraseña temporal");
    expect(password.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password.getAttribute("type")).toBe("text");
  });
});
