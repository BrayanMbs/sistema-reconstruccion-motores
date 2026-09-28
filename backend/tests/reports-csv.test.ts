import { describe, expect, it } from "vitest";
import { buildReportCsv, escapeCsvCell, reportFileDate, sanitizeCsvCell } from "../src/utils/reports-csv";

describe("reports CSV generation", () => {
  it("escapes commas, quotes and line breaks as valid CSV", () => {
    expect(escapeCsvCell("Motor, diésel")).toBe('"Motor, diésel"');
    expect(escapeCsvCell('Motor "X"')).toBe('"Motor ""X"""');
    expect(escapeCsvCell("línea 1\r\nlínea 2")).toBe('"línea 1\nlínea 2"');
  });

  it("protects spreadsheet formulas without corrupting legitimate numbers", () => {
    for (const value of ["=SUM(A1:A2)", "+cmd", "-formula", "@payload", "\tformula"]) {
      expect(sanitizeCsvCell(value)).toBe(`'${value}`);
    }
    expect(sanitizeCsvCell(-125.5)).toBe("-125.5");
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(undefined)).toBe("");
  });

  it("emits UTF-8 BOM, readable headers and Unicode data", () => {
    const csv = buildReportCsv("clients", [{
      id: "client", fullName: "José Pérez", identificationType: "DPI", identification: "123",
      phone: null, email: "josé@example.com", createdAt: "2026-09-28T10:00:00.000Z",
      orderCount: 1, pendingOrders: 0, inProgressOrders: 1, completedOrders: 0,
      cancelledOrders: 0, lastOrderAt: "2026-09-28T10:00:00.000Z"
    }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Cliente"');
    expect(csv).toContain('"José Pérez"');
    expect(csv).toContain('"2026-09-28 04:00"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("uses Guatemala time and preserves a legitimate negative monetary number", () => {
    const csv = buildReportCsv("finance", [{
      id: "payment", workOrderId: "order", workOrderCode: "OT-1", clientName: "Cliente",
      amount: -125.5, method: "Ajuste", reference: null, receivedBy: null,
      createdAt: "2026-09-28T03:00:00.000Z"
    }]);
    expect(csv).toContain('"2026-09-27 21:00"');
    expect(csv).toContain('"-125.5"');
    expect(csv).not.toContain("'-125.5");
    expect(reportFileDate(new Date("2026-09-28T03:00:00.000Z"))).toBe("2026-09-27");
  });

  it("returns a header-only CSV for an empty export", () => {
    const csv = buildReportCsv("finance", []);
    expect(csv).toContain('"Fecha","Orden","Cliente","Monto"');
    expect(csv.trim().split("\r\n")).toHaveLength(1);
  });
});

