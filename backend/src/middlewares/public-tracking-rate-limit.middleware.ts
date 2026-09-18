import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error";

type AttemptWindow = { count: number; startedAt: number };

/** Stores only IP counters; tracking codes never reach logs or this rate limiter. */
export const createPublicTrackingRateLimiter = (limit = 10, windowMs = 15 * 60 * 1000): RequestHandler => {
  const attempts = new Map<string, AttemptWindow>();
  return (request, _response, next) => {
    const key = request.ip || request.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = attempts.get(key);
    const window = !current || now - current.startedAt >= windowMs ? { count: 0, startedAt: now } : current;
    window.count += 1;
    attempts.set(key, window);
    if (window.count > limit) return next(new AppError("Demasiadas consultas. Intenta nuevamente más tarde.", 429, "PUBLIC_TRACKING_RATE_LIMIT"));
    return next();
  };
};
