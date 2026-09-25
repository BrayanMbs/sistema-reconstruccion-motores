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
      vi.spyOn(databasePool, "query").mockRejectedValueOnce(
        new Error("Connection terminated unexpectedly")
      );

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

  describe("Dynamic environment & Express CORS behavior", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      vi.resetModules();
    });

    const loadIsolatedApp = async () => {
      vi.resetModules();
      const { app: isolatedApp } = await import("../src/app");
      return isolatedApp;
    };

    it("allows valid preview URLs of the configured project when ALLOW_VERCEL_PREVIEWS is enabled", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      process.env.ALLOW_VERCEL_PREVIEWS = "true";
      process.env.VERCEL_PREVIEW_PROJECT_NAME = "sistema-reconstruccion-motores";
      delete process.env.CORS_ORIGINS;
      delete process.env.FRONTEND_URL;

      const dynamicApp = await loadIsolatedApp();

      // Branch preview format: <project>-git-<branch>-<scope>.vercel.app
      const branchOrigin = "https://sistema-reconstruccion-motores-git-feat-x-brayan.vercel.app";
      const branchRes = await request(dynamicApp).get("/health").set("Origin", branchOrigin);
      expect(branchRes.headers["access-control-allow-origin"]).toBe(branchOrigin);

      // Deployment hash preview format: <project>-<hash>-<scope>.vercel.app
      const hashOrigin = "https://sistema-reconstruccion-motores-abc1234-brayan.vercel.app";
      const hashRes = await request(dynamicApp).get("/health").set("Origin", hashOrigin);
      expect(hashRes.headers["access-control-allow-origin"]).toBe(hashOrigin);

      // Root project alias: <project>.vercel.app
      const rootOrigin = "https://sistema-reconstruccion-motores.vercel.app";
      const rootRes = await request(dynamicApp).get("/health").set("Origin", rootOrigin);
      expect(rootRes.headers["access-control-allow-origin"]).toBe(rootOrigin);
    });

    it("rejects previews of other vercel projects or malicious domains", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      process.env.ALLOW_VERCEL_PREVIEWS = "true";
      process.env.VERCEL_PREVIEW_PROJECT_NAME = "sistema-reconstruccion-motores";

      const dynamicApp = await loadIsolatedApp();

      // Another arbitrary project on vercel
      const foreignRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://otro-proyecto.vercel.app");
      expect(foreignRes.headers["access-control-allow-origin"]).toBeUndefined();

      // Malicious origin attempting spoofing
      const maliciousRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://malicious.vercel.app");
      expect(maliciousRes.headers["access-control-allow-origin"]).toBeUndefined();

      // Subdomain spoofing
      const attackerRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://sistema-reconstruccion-motores.attacker.com");
      expect(attackerRes.headers["access-control-allow-origin"]).toBeUndefined();

      // Prefixed project attack
      const prefixRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://fake-sistema-reconstruccion-motores.vercel.app");
      expect(prefixRes.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("rejects preview deployments when ALLOW_VERCEL_PREVIEWS is false (default)", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      delete process.env.ALLOW_VERCEL_PREVIEWS; // defaults to false
      process.env.VERCEL_PREVIEW_PROJECT_NAME = "sistema-reconstruccion-motores";

      const dynamicApp = await loadIsolatedApp();

      const res = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://sistema-reconstruccion-motores-git-feat.vercel.app");
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("allows FRONTEND_URL and CORS_ORIGINS simultaneously without losing either", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      process.env.FRONTEND_URL = "https://frontend-oficial.vercel.app";
      process.env.CORS_ORIGINS = "https://otro-autorizado.example.com";

      const dynamicApp = await loadIsolatedApp();

      // FRONTEND_URL is allowed
      const officialRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://frontend-oficial.vercel.app");
      expect(officialRes.headers["access-control-allow-origin"]).toBe(
        "https://frontend-oficial.vercel.app"
      );

      // CORS_ORIGINS additional domain is allowed
      const additionalRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://otro-autorizado.example.com");
      expect(additionalRes.headers["access-control-allow-origin"]).toBe(
        "https://otro-autorizado.example.com"
      );

      // Other domain is rejected
      const deniedRes = await request(dynamicApp)
        .get("/health")
        .set("Origin", "https://no-autorizado.com");
      expect(deniedRes.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("rejects localhost in production unless explicitly included in CORS_ORIGINS", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@ep-sample.supabase.co:5432/postgres";
      delete process.env.CORS_ORIGINS;
      delete process.env.FRONTEND_URL;

      const dynamicAppWithoutLocalhost = await loadIsolatedApp();

      // Localhost rejected in production by default
      const rejectedRes = await request(dynamicAppWithoutLocalhost)
        .get("/health")
        .set("Origin", "http://localhost:3000");
      expect(rejectedRes.headers["access-control-allow-origin"]).toBeUndefined();

      // When administrator explicitly adds localhost to CORS_ORIGINS
      process.env.CORS_ORIGINS = "http://localhost:3000";
      const dynamicAppWithExplicitLocalhost = await loadIsolatedApp();

      const allowedRes = await request(dynamicAppWithExplicitLocalhost)
        .get("/health")
        .set("Origin", "http://localhost:3000");
      expect(allowedRes.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });

    it("allows request without Origin header (server-to-server / monitoring)", async () => {
      const dynamicApp = await loadIsolatedApp();
      const response = await request(dynamicApp).get("/health");

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

    it("defaults DB_POOL_MAX to 10 in development when unset", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;
      delete process.env.CLOUD_DATABASE_REQUIRED;
      delete process.env.DB_POOL_MAX;

      vi.resetModules();
      const { env } = await import("../src/config/env");

      expect(env.isProduction).toBe(false);
      expect(env.database.max).toBe(10);
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
  });
});
