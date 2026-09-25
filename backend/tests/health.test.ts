import type { QueryResult } from "pg";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { databasePool } from "../src/config/database";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 and UP status", async () => {
    vi.spyOn(databasePool, "query").mockResolvedValueOnce({
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      rows: [{ "?column?": 1 }],
      fields: []
    } as unknown as QueryResult);

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("UP");
    expect(response.body.service).toBe("sistema-reconstruccion-motores");
  });

  it("rejects an administrative route with no session", async () => {
    const response = await request(app).get("/api/admin/dashboard");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_REQUIRED");
  });
});
