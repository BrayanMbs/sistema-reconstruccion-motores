import type { QueryResult } from "pg";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { databasePool } from "../src/config/database";

describe("Deployment configuration & endpoints", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Health check separation (Liveness vs Readiness)", () => {
    it("responds 200 on /health with UP status without querying database (Liveness)", async () => {
      const querySpy = vi.spyOn(databasePool, "query");

      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "UP",
        service: "sistema-reconstruccion-motores"
      });
      expect(response.body.database).toBeUndefined();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it("responds 200 on /api/health when database is connected (Readiness)", async () => {
      vi.spyOn(databasePool, "query").mockResolvedValueOnce({
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        rows: [{ "?column?": 1 }],
        fields: []
      } as unknown as QueryResult);

      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "UP",
        service: "sistema-reconstruccion-motores",
        database: "connected"
      });
    });

    it("responds 503 on /api/health when database is disconnected (Readiness)", async () => {
      vi.spyOn(databasePool, "query").mockRejectedValueOnce(new Error("Connection terminated unexpectedly"));

      const response = await request(app).get("/api/health");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        status: "DEGRADED",
        service: "sistema-reconstruccion-motores",
        database: "disconnected"
      });
      expect(response.body.error).toBeUndefined();
      expect(response.body.stack).toBeUndefined();
    });
  });

  describe("CORS behavior", () => {
    it("allows configured localhost origin in development", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });

    it("does not allow untrusted origin by default", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://malicious-site.example.com");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("rejects generic arbitrary .vercel.app origin", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://unrelated-project.vercel.app");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("allows request without Origin header (server-to-server / monitoring)", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
    });
  });

  describe("Environment configuration & Pool isolation", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      vi.resetModules();
    });

    it("defaults DB_POOL_MAX to 1 in production when unset", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      delete process.env.DB_POOL_MAX;

      vi.resetModules();
      const { env } = await import("../src/config/env");

      expect(env.isProduction).toBe(true);
      expect(env.database.max).toBe(1);
    });

    it("respects DB_POOL_MAX override in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      process.env.DB_POOL_MAX = "3";

      vi.resetModules();
      const { env } = await import("../src/config/env");

      expect(env.isProduction).toBe(true);
      expect(env.database.max).toBe(3);
    });

    it("fails fast if DATABASE_URL is missing in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      delete process.env.CLOUD_DATABASE_REQUIRED;

      vi.resetModules();
      await expect(import("../src/config/env")).rejects.toThrow(
        "DATABASE_URL es obligatoria en producción"
      );
    });

    it("allows preview URLs matching project name when ALLOW_VERCEL_PREVIEWS is enabled", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      process.env.ALLOW_VERCEL_PREVIEWS = "true";
      process.env.VERCEL_PREVIEW_PROJECT_NAME = "sistema-reconstruccion-motores";

      vi.resetModules();
      const { env } = await import("../src/config/env");
      expect(env.allowVercelPreviews).toBe(true);
      expect(env.vercelPreviewProject).toBe("sistema-reconstruccion-motores");
    });
  });
});
