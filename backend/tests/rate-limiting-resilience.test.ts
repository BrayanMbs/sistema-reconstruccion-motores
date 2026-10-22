import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, createApp } from "../src/app";
import { env } from "../src/config/env";

describe("Resilience, Security Headers and Abuse Protection", () => {
  describe("Security Headers", () => {
    it("sets hardened security headers and removes X-Powered-By", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.headers["x-powered-by"]).toBeUndefined();
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-xss-protection"]).toBe("0");
      expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(response.headers["permissions-policy"]).toContain("geolocation=()");
      expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    });
  });

  describe("Body parser limit and error handling", () => {
    it("returns 413 PAYLOAD_TOO_LARGE when request body exceeds configured limit", async () => {
      // Create a test app with small body limit (1kb) to test 413
      const smallBodyEnv = {
        ...env,
        bodyLimit: "1kb"
      };
      const testApp = createApp(smallBodyEnv);

      // Create a payload larger than 1kb
      const oversizedPayload = {
        data: "X".repeat(2048)
      };

      const response = await request(testApp)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(oversizedPayload));

      expect(response.status).toBe(413);
      expect(response.body).toEqual({
        message: "El tamaño del cuerpo de la solicitud excede el límite permitido",
        code: "PAYLOAD_TOO_LARGE"
      });
    });

    it("returns 400 INVALID_JSON on malformed JSON payload without crashing or exposing stack traces", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{ broken json: true, ");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Formato JSON inválido",
        code: "INVALID_JSON"
      });
    });
  });

  describe("Rate Limit headers and 429 response", () => {
    it("includes standard RateLimit-* headers on API responses", async () => {
      const response = await request(app).get("/api/public/non-existent-route");

      expect(response.headers).toHaveProperty("ratelimit-limit");
      expect(response.headers).toHaveProperty("ratelimit-remaining");
      expect(response.headers).toHaveProperty("ratelimit-reset");
    });

    it("returns 429 with Retry-After when rate limit is exceeded", async () => {
      // Test app with very low rate limit (3 requests)
      const strictRateLimitEnv = {
        ...env,
        rateLimit: {
          ...env.rateLimit,
          enabled: true,
          apiMax: 3,
          apiWindowMs: 60 * 1000
        }
      };
      const testApp = createApp(strictRateLimitEnv);

      // Request 1, 2, 3 succeed
      for (let i = 0; i < 3; i++) {
        const res = await request(testApp).get("/api/public/non-existent-route");
        expect(res.status).not.toBe(429);
      }

      // 4th request exceeds rate limit
      const exceededRes = await request(testApp).get("/api/public/non-existent-route");
      expect(exceededRes.status).toBe(429);
      expect(exceededRes.body.code).toBe("API_RATE_LIMIT_EXCEEDED");
      expect(exceededRes.headers).toHaveProperty("retry-after");
      expect(Number(exceededRes.headers["retry-after"])).toBeGreaterThan(0);
    });
  });

  describe("k6 load testing tool neutrality", () => {
    it("does NOT block or discriminate against requests from k6 User-Agent", async () => {
      const k6UserAgents = [
        "k6/0.50.0 (https://k6.io/)",
        "k6/0.49.0 (go1.21.0; windows/amd64)",
        "k6-load-runner"
      ];

      for (const ua of k6UserAgents) {
        const response = await request(app)
          .get("/health")
          .set("User-Agent", ua);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          status: "UP",
          service: "sistema-reconstruccion-motores"
        });
      }
    });
  });
});
