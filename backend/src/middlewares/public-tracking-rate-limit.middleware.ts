import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

type AttemptWindow = { count: number; startedAt: number };

/** Stores only IP counters; tracking codes never reach logs or this rate limiter. */
export const createPublicTrackingRateLimiter = (
  limit = env.rateLimit.publicTrackingMax,
  windowMs = env.rateLimit.publicTrackingWindowMs
): RequestHandler => {
  const attempts = new Map<string, AttemptWindow>();
  return (request, response, next) => {
    if (!env.rateLimit.enabled) return next();

    const key = request.ip || request.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = attempts.get(key);
    const window = !current || now - current.startedAt >= windowMs ? { count: 0, startedAt: now } : current;
    window.count += 1;
    attempts.set(key, window);

    const remaining = Math.max(0, limit - window.count);
    const resetSeconds = Math.max(1, Math.ceil((window.startedAt + windowMs - now) / 1000));

    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(resetSeconds));

    if (window.count > limit) {
      response.setHeader("Retry-After", String(resetSeconds));
      return next(new AppError("Demasiadas consultas. Intenta nuevamente más tarde.", 429, "PUBLIC_TRACKING_RATE_LIMIT", {
        retryAfter: resetSeconds,
        remainingSeconds: resetSeconds
      }));
    }
    return next();
  };
};
