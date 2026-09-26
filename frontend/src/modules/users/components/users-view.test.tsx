import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersView } from "./users-view";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/shared/services/api", () => ({ apiRequest: apiRequestMock }));

const activeUser = {
  id: "user-1",
  fullName: "Ana Pérez",
  email: "ana@example.com",
  role: "ADMINISTRATIVE" as const,
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

let currentUser = activeUser;

describe("UsersView mobile actions", () => {
  beforeEach(() => {
    currentUser = activeUser;
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/users?")) return Promise.resolve({ items: [currentUser], total: 1, page: 1, limit: 20 });
      if (path === "/api/admin/users/user-1/reset-password") return Promise.resolve({ temporaryPassword: "Temp1234" });
      if (path === "/api/admin/users/user-1/status") return Promise.resolve({ user: { ...currentUser, isActive: !currentUser.isActive } });
      return Promise.resolve({});
    });
  });
  afterEach(cleanup);

  it("opens a reset confirmation without calling the endpoint immediately", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));

    expect(screen.getByRole("dialog", { name: "Restablecer contraseña" })).toBeTruthy();
    expect(screen.getAllByText("Ana Pérez").length).toBeGreaterThan(0);
    expect(apiRequestMock).not.toHaveBeenCalledWith("/api/admin/users/user-1/reset-password", expect.anything());
  });

  it("cancels password reset without calling its endpoint", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog", { name: "Restablecer contraseña" })).toBeNull();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/api/admin/users/user-1/reset-password", expect.anything());
  });

  it("resets the password only after confirmation and preserves the temporary credential dialog", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users/user-1/reset-password", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByRole("dialog", { name: "Contraseña temporal generada" })).toBeTruthy();
    expect(screen.getByText("Temp1234")).toBeTruthy();
  });

  it("uses a confirmation dialog before inactivating a user from desktop actions", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Inactivar Ana Pérez" }));

    expect(screen.getByRole("dialog", { name: "Inactivar usuario" })).toBeTruthy();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/api/admin/users/user-1/status", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Inactivar usuario" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users/user-1/status", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isActive: false }) })));
  });

  it("uses the same confirmation flow to activate an inactive user", async () => {
    currentUser = { ...activeUser, isActive: false };
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Activar usuario" }));

    expect(screen.getByRole("dialog", { name: "Activar usuario" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Activar usuario" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users/user-1/status", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isActive: true }) })));
  });

  it("keeps the edit dialog accessible on small viewports", async () => {
    render(<UsersView />);
    fireEvent.click(await screen.findByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar usuario" }));

    expect(await screen.findByRole("dialog", { name: "Editar usuario" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
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
