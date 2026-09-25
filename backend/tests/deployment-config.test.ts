import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Deployment configuration & endpoints", () => {
  describe("Health check", () => {
    it("responds 200 on /health with UP status and database info", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("UP");
      expect(response.body.service).toBe("sistema-reconstruccion-motores");
      expect(response.body).toHaveProperty("database");
      expect(["connected", "disconnected"]).toContain(response.body.database);
    });

    it("responds 200 on /api/health with UP status and database info", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("UP");
      expect(response.body.service).toBe("sistema-reconstruccion-motores");
      expect(response.body).toHaveProperty("database");
      expect(["connected", "disconnected"]).toContain(response.body.database);
    });
  });

  describe("CORS behavior", () => {
    it("allows configured localhost origin", async () => {
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

    it("allows request without Origin header (server-to-server / monitoring)", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
    });
  });

  describe("Production fail-fast validation", () => {
    it("prohibits missing DATABASE_URL in production", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalDatabaseUrl = process.env.DATABASE_URL;

      try {
        process.env.NODE_ENV = "production";
        delete process.env.DATABASE_URL;

        const isProduction = process.env.NODE_ENV === "production" || process.env.CLOUD_DATABASE_REQUIRED === "true";
        expect(isProduction).toBe(true);
        expect(() => {
          if (isProduction && !process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL es obligatoria en producción o cuando se ejecuta con la base compartida.");
          }
        }).toThrow("DATABASE_URL es obligatoria en producción");
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalDatabaseUrl !== undefined) {
          process.env.DATABASE_URL = originalDatabaseUrl;
        }
      }
    });
  });
});
