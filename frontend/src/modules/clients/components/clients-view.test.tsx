import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientsView } from "./clients-view";

const apiRequest = vi.fn();
vi.mock("@/shared/services/api", () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe("ClientsView API isolation", () => {
  beforeEach(() => { apiRequest.mockReset(); apiRequest.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }); });
  afterEach(cleanup);

  it("keeps the Admin API as its default", async () => {
    render(<ClientsView />);
    await waitFor(() => expect(apiRequest.mock.calls[0][0]).toMatch(/^\/api\/admin\/clients\?/));
  });

  it("uses the administrative API when configured", async () => {
    render(<ClientsView apiBase="/api/administrativo" detailBase="/administrativo/clientes" />);
    await waitFor(() => expect(apiRequest.mock.calls[0][0]).toMatch(/^\/api\/administrativo\/clients\?/));
  });
});
