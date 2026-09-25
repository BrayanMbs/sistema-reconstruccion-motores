import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ replace: vi.fn(), apiRequest: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock("@/shared/services/supabase", () => ({ getSupabase: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: {} } }), signOut: state.signOut } }) }));
vi.mock("@/shared/services/api", () => ({ apiRequest: state.apiRequest }));

import { ChangeTemporaryPasswordForm } from "./change-temporary-password-form";

describe("ChangeTemporaryPasswordForm", () => {
  beforeEach(() => {
    state.replace.mockReset();
    state.apiRequest.mockReset();
    state.signOut.mockReset();
    state.apiRequest.mockImplementation((path: string) => path === "/api/auth/me"
      ? Promise.resolve({ user: { id: "worker", fullName: "Operador", role: "OPERATOR", isActive: true, mustChangePassword: true } })
      : Promise.resolve({ user: { id: "worker", fullName: "Operador", role: "OPERATOR", isActive: true, mustChangePassword: false } }));
  });
  afterEach(cleanup);

  it("rejects a weak password before calling the API", async () => {
    render(<ChangeTemporaryPasswordForm />);
    await screen.findByText("Actualiza tu contraseña");
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "weak-password" } });
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "weak-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("alert").textContent).toContain("al menos 12 caracteres");
    expect(state.apiRequest).not.toHaveBeenCalledWith("/api/auth/change-temporary-password", expect.anything());
  });

  it("submits a valid password and redirects to the role home", async () => {
    render(<ChangeTemporaryPasswordForm />);
    await screen.findByText("Actualiza tu contraseña");
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "A-new-password1!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "A-new-password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await waitFor(() => expect(state.apiRequest).toHaveBeenCalledWith("/api/auth/change-temporary-password", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/operativo/inicio"));
  });
});
