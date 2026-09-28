import { describe, expect, it } from "vitest";
import {
  reportFinanceFilters,
  reportInventoryMovementFilters,
  reportOrderFilters,
  reportSummaryFilters
} from "../src/validators/reports.validators";

describe("reports validators", () => {
  it("uses an unfiltered summary by default", () => {
    expect(reportSummaryFilters({})).toEqual({ startDate: undefined, endDate: undefined, status: undefined });
  });

  it("accepts valid date, status and pagination filters", () => {
    expect(reportOrderFilters({ startDate: "2026-01-01", endDate: "2026-01-31", status: "COMPLETED", page: "2", limit: "25" }))
      .toEqual({ startDate: "2026-01-01", endDate: "2026-01-31", status: "COMPLETED", search: undefined, page: 2, limit: 25 });
  });

  it("rejects an inverted date range", () => {
    expect(() => reportSummaryFilters({ startDate: "2026-02-01", endDate: "2026-01-31" }))
      .toThrowError(expect.objectContaining({ code: "INVALID_DATE_RANGE", statusCode: 422 }));
  });

  it("rejects malformed dates and unknown work-order statuses", () => {
    expect(() => reportSummaryFilters({ startDate: "2026-02-30" })).toThrow(/fecha válida/);
    expect(() => reportSummaryFilters({ status: "PAID" })).toThrowError(expect.objectContaining({ code: "INVALID_REPORT_STATUS" }));
  });

  it("rejects invalid pagination and caps the existing maximum at 100", () => {
    expect(() => reportOrderFilters({ page: "0" })).toThrowError(expect.objectContaining({ code: "INVALID_PAGINATION" }));
    expect(() => reportOrderFilters({ limit: "abc" })).toThrowError(expect.objectContaining({ code: "INVALID_PAGINATION" }));
    expect(reportFinanceFilters({ page: "3", limit: "500" })).toMatchObject({ page: 3, limit: 100 });
  });

  it("applies the same date-range validation to inventory movements", () => {
    expect(() => reportInventoryMovementFilters({ startDate: "2026-03-02", endDate: "2026-03-01" }))
      .toThrowError(expect.objectContaining({ code: "INVALID_DATE_RANGE" }));
  });
});

