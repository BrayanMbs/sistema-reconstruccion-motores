import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exportCsv = vi.hoisted(() => vi.fn());
vi.mock("../services/reports.service", () => ({ reportsService: { exportCsv } }));
import { ExportCsvButton } from "./export-csv-button";

describe("ExportCsvButton", () => {
  const createObjectURL = vi.fn(() => "blob:report");
  const revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  });
  afterEach(cleanup);

  it("uses current filters, downloads the response and prevents duplicate requests", async () => {
    let resolve!: (value: { blob: Blob; filename: string; truncated: boolean; total: number }) => void;
    exportCsv.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<ExportCsvButton type="orders" filters={{ search: "motor", status: "COMPLETED", page: 2, limit: 20 }} />);
    const button = screen.getByRole("button", { name: "Exportar CSV" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(exportCsv).toHaveBeenCalledTimes(1);
    expect(exportCsv).toHaveBeenCalledWith("orders", { search: "motor", status: "COMPLETED", page: 2, limit: 20 });
    expect((screen.getByRole("button", { name: "Exportando..." }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolve({ blob: new Blob(["csv"]), filename: "reporte.csv", truncated: false, total: 1 }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });

  it("shows an error and allows a successful retry", async () => {
    exportCsv.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ blob: new Blob(["csv"]), filename: "reporte.csv", truncated: true, total: 6000 });
    render(<ExportCsvButton type="finance" filters={{ method: "Efectivo" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No fue posible exportar");
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect((await screen.findByRole("status")).textContent).toContain("primeras 5,000 filas de 6000");
    expect(exportCsv).toHaveBeenCalledTimes(2);
  });
});

