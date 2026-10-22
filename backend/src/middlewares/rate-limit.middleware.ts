import type { Request, RequestHandler, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  message?: string;
  errorCode?: string;
  keyGenerator?: (request: Request) => string;
}

interface WindowData {
  count: number;
  startedAt: number;
}

export const createRateLimiter = (options: RateLimitOptions): RequestHandler => {
  const attempts = new Map<string, WindowData>();
  const defaultKeyGen = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";
  const keyGen = options.keyGenerator ?? defaultKeyGen;
  const errorCode = options.errorCode ?? "RATE_LIMIT_EXCEEDED";
  const message = options.message ?? "Demasiadas solicitudes. Intenta de nuevo más tarde.";

  // Periodic cleanup every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of attempts.entries()) {
      if (now - data.startedAt >= options.windowMs) {
        attempts.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return (request: Request, response: Response, next) => {
    if (!env.rateLimit.enabled) {
      return next();
    }

    const key = keyGen(request);
    const now = Date.now();
    const current = attempts.get(key);

    const window = !current || now - current.startedAt >= options.windowMs
      ? { count: 0, startedAt: now }
      : current;

    window.count += 1;
    attempts.set(key, window);

    const remaining = Math.max(0, options.max - window.count);
    const resetSeconds = Math.max(1, Math.ceil((window.startedAt + options.windowMs - now) / 1000));

    response.setHeader("RateLimit-Limit", String(options.max));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(resetSeconds));

    if (window.count > options.max) {
      response.setHeader("Retry-After", String(resetSeconds));
      return next(
        new AppError(message, 429, errorCode, {
          retryAfter: resetSeconds,
          remainingSeconds: resetSeconds
        })
      );
    }

    return next();
  };
};

