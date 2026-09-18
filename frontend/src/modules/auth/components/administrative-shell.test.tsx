import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdministrativeShell } from "./administrative-shell";

const state = vi.hoisted(() => ({ role: "ADMINISTRATIVE", hasSession: true, replace: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => "/administrativo/dashboard" }));
vi.mock("next/link", () => ({ default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => <a href={href} onClick={(event) => { event.preventDefault(); onClick?.(); }}>{children}</a> }));
vi.mock("@/shared/services/supabase", () => ({ getSupabase: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: state.hasSession ? {} : null } }), signOut: state.signOut } }) }));
vi.mock("@/shared/services/api", () => ({ apiRequest: () => Promise.resolve({ user: { id: "user", fullName: "Ana", role: state.role, isActive: true } }) }));

describe("AdministrativeShell", () => {
  beforeEach(() => { state.role = "ADMINISTRATIVE"; state.hasSession = true; state.replace.mockReset(); state.signOut.mockReset(); });
  afterEach(cleanup);

  it("renders an administrative user and only the allowed navigation", async () => {
    render(<AdministrativeShell><p>Contenido protegido</p></AdministrativeShell>);
    expect(await screen.findByText("Contenido protegido")).toBeTruthy();
    for (const label of ["Dashboard", "Clientes", "Órdenes de trabajo", "Asignaciones"]) expect(screen.getByText(label)).toBeTruthy();
    for (const label of ["Usuarios", "Auditoría", "Inventario", "Finanzas", "Configuración"]) expect(screen.queryByText(label)).toBeNull();
  });

  it("opens and closes the mobile navigation drawer", async () => {
    render(<AdministrativeShell><p>Contenido protegido</p></AdministrativeShell>);
    const openButton = await screen.findByRole("button", { name: "Abrir menú" });
    fireEvent.click(openButton);
    const drawer = screen.getByRole("dialog", { name: "Navegación administrativa" });
    for (const label of ["Dashboard", "Clientes", "Órdenes de trabajo", "Asignaciones", "Cerrar sesión"]) expect(within(drawer).getByText(label)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole("button", { name: "Cerrar menú" }));
    expect(screen.queryByRole("dialog", { name: "Navegación administrativa" })).toBeNull();
  });

  it("closes the mobile drawer after selecting a route", async () => {
    render(<AdministrativeShell><p>Contenido protegido</p></AdministrativeShell>);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir menú" }));
    const drawer = screen.getByRole("dialog", { name: "Navegación administrativa" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Clientes" }));
    expect(screen.queryByRole("dialog", { name: "Navegación administrativa" })).toBeNull();
  });

  it("redirects a different role to its own home", async () => {
    state.role = "ADMIN";
    render(<AdministrativeShell><p>Protegido</p></AdministrativeShell>);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/admin/dashboard"));
    expect(screen.queryByText("Protegido")).toBeNull();
  });

  it("redirects a missing session to login", async () => {
    state.hasSession = false;
    render(<AdministrativeShell><p>Protegido</p></AdministrativeShell>);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Protegido")).toBeNull();
  });
});
