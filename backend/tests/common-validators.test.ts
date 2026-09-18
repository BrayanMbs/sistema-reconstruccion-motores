import { describe, expect, it } from "vitest";
import { optionalDate } from "../src/validators/common.validators";

describe("optionalDate", () => {
  it("accepts a real ISO calendar date", () => { expect(optionalDate("2026-02-28", "Fecha estimada")).toBe("2026-02-28"); });
  it.each(["2026-99-99", "hola", "2026-02-30"])("rejects invalid date %s", (value) => {
    expect(() => optionalDate(value, "Fecha estimada")).toThrowError();
    try { optionalDate(value, "Fecha estimada"); } catch (error) { expect(error).toMatchObject({ statusCode: 422, code: "VALIDATION_ERROR" }); }
  });
});
