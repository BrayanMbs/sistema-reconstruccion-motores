import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientsView } from "./clients-view";
import type { Client } from "@/shared/models/admin";

const apiRequest = vi.fn();
vi.mock("@/shared/services/api", () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const sampleClient: Client = {
  id: "client-123",
  fullName: "Carlos Mendoza",
  identificationType: "DPI",
  identification: "1234567890101",
  phone: "55551234",
  email: "carlos@example.com",
  address: "Zona 1, Ciudad de Guatemala",
  createdAt: "2026-09-01T10:00:00Z"
};

describe("ClientsView API isolation and editing", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ items: [sampleClient], total: 1, page: 1, limit: 20 });
  });
  afterEach(cleanup);

  it("keeps the Admin API as its default", async () => {
    render(<ClientsView />);
    await waitFor(() => expect(apiRequest.mock.calls[0][0]).toMatch(/^\/api\/admin\/clients\?/));
  });

  it("uses the administrative API when configured", async () => {
    render(<ClientsView apiBase="/api/administrativo" detailBase="/administrativo/clientes" />);
    await waitFor(() => expect(apiRequest.mock.calls[0][0]).toMatch(/^\/api\/administrativo\/clients\?/));
  });

  it("opens edit dialog prefilled and submits PUT request with updated data", async () => {
    apiRequest.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes("/clients?")) return { items: [sampleClient], total: 1, page: 1, limit: 20 };
      if (url === "/api/admin/clients/client-123" && options?.method === "PUT") {
        return { client: { ...sampleClient, fullName: "Carlos Mendoza Actualizado" } };
      }
      return {};
    });

    render(<ClientsView />);

    await waitFor(() => expect(screen.getByText("Carlos Mendoza")).toBeTruthy());

    // Click on Edit button in row
    const editButton = screen.getByRole("button", { name: "Editar Carlos Mendoza" });
    fireEvent.click(editButton);

    // Verify dialog opens in edit mode
    expect(screen.getByText("Editar cliente")).toBeTruthy();
    expect(screen.getByText("Actualice la información del cliente registrado.")).toBeTruthy();
    const nameInput = screen.getByDisplayValue("Carlos Mendoza");
    expect(nameInput).toBeTruthy();

    // Modify name
    fireEvent.change(nameInput, { target: { value: "Carlos Mendoza Modificado" } });

    // Submit form
    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/admin/clients/client-123",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("Carlos Mendoza Modificado")
        })
      );
    });
  });

  it("rejects SQL injection payloads when saving client and displays error", async () => {
    render(<ClientsView />);
    await waitFor(() => expect(screen.getByText("Carlos Mendoza")).toBeTruthy());

    const editButton = screen.getByRole("button", { name: "Editar Carlos Mendoza" });
    fireEvent.click(editButton);

    const nameInput = screen.getByDisplayValue("Carlos Mendoza");
    fireEvent.change(nameInput, { target: { value: "' OR '1'='1" } });

    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });
    fireEvent.click(saveButton);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/no se permiten patrones de inyección|caracteres o expresiones no permitidas/i)).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/api/admin/clients/client-123",
      expect.objectContaining({ method: "PUT" })
    );
  });
});
