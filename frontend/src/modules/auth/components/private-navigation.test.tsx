import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./admin-shell";
import { CashierShell } from "./cashier-shell";
import { InventoryShell } from "./inventory-shell";
import { OperationalShell } from "./operational-shell";

const state = vi.hoisted(() => ({
  role: "ADMIN",
  pathname: "/admin/dashboard",
  replace: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
  usePathname: () => state.pathname
}));
vi.mock("next/link", () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  )
}));
vi.mock("@/shared/services/supabase", () => ({
  getSupabase: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: {} } }),
      signOut: state.signOut
    }
  })
}));
vi.mock("@/shared/services/api", () => ({
  apiRequest: () => Promise.resolve({ user: { id: "user", fullName: "Ana", role: state.role, isActive: true } })
}));

const portals = [
  {
    name: "administrador",
    Component: AdminShell,
    role: "ADMIN",
    pathname: "/admin/dashboard",
    drawerLabel: "Navegación de administrador",
    allowed: ["Dashboard", "Usuarios y roles", "Clientes", "Órdenes de trabajo"],
    forbidden: "Cobros"
  },
  {
    name: "caja",
    Component: CashierShell,
    role: "CASHIER",
    pathname: "/caja",
    drawerLabel: "Navegación de caja",
    allowed: ["Inicio", "Cobros", "Historial de pagos", "Cierre de caja"],
    forbidden: "Usuarios y roles"
  },
  {
    name: "inventario",
    Component: InventoryShell,
    role: "INVENTORY",
    pathname: "/inventario",
    drawerLabel: "Navegación de inventario",
    allowed: ["Inventario", "Repuestos y materiales", "Historial de inventario"],
    forbidden: "Cobros"
  },
  {
    name: "operativo",
    Component: OperationalShell,
    role: "OPERATOR",
    pathname: "/operativo/inicio",
    drawerLabel: "Navegación operativa",
    allowed: ["Inicio", "Mis órdenes asignadas", "Mi actividad", "Notificaciones"],
    forbidden: "Finanzas"
  }
] as const;

describe("navegación privada responsive", () => {
  beforeEach(() => {
    state.replace.mockReset();
    state.signOut.mockReset();
  });
  afterEach(cleanup);

  it.each(portals)("muestra únicamente la navegación permitida para $name", async ({ Component, role, pathname, drawerLabel, allowed, forbidden }) => {
    state.role = role;
    state.pathname = pathname;
    render(<Component><p>Contenido protegido</p></Component>);

    const openButton = await screen.findByRole("button", { name: "Abrir menú" });
    fireEvent.click(openButton);

    const drawer = screen.getByRole("dialog", { name: drawerLabel });
    for (const label of allowed) {
      expect(within(drawer).getByRole("link", { name: label })).toBeTruthy();
    }
    expect(within(drawer).queryByText(forbidden)).toBeNull();
  });

  it("cierra el drawer con Escape y al elegir una ruta", async () => {
    state.role = "ADMIN";
    state.pathname = "/admin/dashboard";
    render(<AdminShell><p>Contenido protegido</p></AdminShell>);

    fireEvent.click(await screen.findByRole("button", { name: "Abrir menú" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Navegación de administrador" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const drawer = screen.getByRole("dialog", { name: "Navegación de administrador" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Clientes" }));
    expect(screen.queryByRole("dialog", { name: "Navegación de administrador" })).toBeNull();
  });
});
