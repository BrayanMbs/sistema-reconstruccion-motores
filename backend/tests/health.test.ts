import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("GET /api/health", () => {
  it("returns 200 and UP status", async () => {
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
