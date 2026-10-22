import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "./global-search";

const apiRequestMock = vi.fn();
vi.mock("@/shared/services/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

describe("GlobalSearch component", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ query: "", results: { orders: [], clients: [], users: [], inventory: [] } });
    pushMock.mockReset();
  });
  afterEach(cleanup);

  it("renders the search input with placeholder and shortcut hint", () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Buscar en el sistema...");
    expect(input).toBeTruthy();
    expect(screen.getByText("Ctrl K")).toBeTruthy();
  });

  it("shows matching system pages when typing a navigation keyword", async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Buscar en el sistema...");

    fireEvent.change(input, { target: { value: "inventario" } });

    expect(await screen.findByRole("listbox")).toBeTruthy();
    expect(screen.getByText("Páginas (1)")).toBeTruthy();
    expect(screen.getByText("Repuestos, insumos y existencias")).toBeTruthy();
  });

  it("fetches and displays categorized search results from the backend", async () => {
    apiRequestMock.mockResolvedValue({
      query: "Toyota",
      results: {
        orders: [
          { id: "wo-1", code: "OT-2026-00001", engineBrand: "Toyota", engineModel: "1KD-FTV", clientName: "Carlos Mendoza", status: "IN_PROGRESS" }
        ],
        clients: [
          { id: "c-1", fullName: "Toyota Motors S.A.", identificationType: "NIT", identification: "123456-7", phone: "55551234", email: null }
        ],
        users: [],
        inventory: [
          { id: "inv-1", code: "REP-CUL-01", name: "Culata Toyota", brand: "Toyota", category: "Culatas", stock: 4 }
        ]
      }
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Buscar en el sistema...");

    fireEvent.change(input, { target: { value: "Toyota" } });

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/search?q=Toyota");
    });

    expect(await screen.findByText(/OT-2026-00001 · Toyota 1KD-FTV/)).toBeTruthy();
    expect(screen.getByText("Toyota Motors S.A.")).toBeTruthy();
    expect(screen.getByText(/REP-CUL-01 - Culata Toyota/)).toBeTruthy();
  });

  it("navigates to the selected item on click and closes dropdown", async () => {
    apiRequestMock.mockResolvedValue({
      query: "Toyota",
      results: {
        orders: [
          { id: "wo-1", code: "OT-2026-00001", engineBrand: "Toyota", engineModel: "1KD-FTV", clientName: "Carlos Mendoza", status: "IN_PROGRESS" }
        ],
        clients: [],
        users: [],
        inventory: []
      }
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Buscar en el sistema...");

    fireEvent.change(input, { target: { value: "Toyota" } });

    const orderButton = await screen.findByText(/OT-2026-00001 · Toyota 1KD-FTV/);
    fireEvent.click(orderButton);

    expect(pushMock).toHaveBeenCalledWith("/admin/work-orders?search=OT-2026-00001");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("clears the search when clicking the clear button", async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Buscar en el sistema...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "Carlos" } });
    expect(input.value).toBe("Carlos");

    const clearButton = await screen.findByRole("button", { name: "Limpiar búsqueda" });
    fireEvent.click(clearButton);

    expect(input.value).toBe("");
  });
});
