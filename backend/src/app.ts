import cors, { type CorsOptions } from "cors";
import express from "express";
import { env } from "./config/env";
import { getLiveness } from "./controllers/health.controller";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { createRateLimiter } from "./middlewares/rate-limit.middleware";
import { requestTimeoutMiddleware } from "./middlewares/request-timeout.middleware";
import { securityHeadersMiddleware } from "./middlewares/security-headers.middleware";
import { apiRouter } from "./routes";

export const isVercelPreviewOrigin = (
  origin: string,
  allowPreviews: boolean = env.allowVercelPreviews,
  projectName?: string
): boolean => {
  const targetProject = projectName ?? env.vercelPreviewProject;
  if (!allowPreviews || !targetProject) {
    return false;
  }
  const escapedProject = targetProject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const previewRegex = new RegExp(`^https:\\/\\/${escapedProject}(-[a-zA-Z0-9-]+)?\\.vercel\\.app$`, "i");
  return previewRegex.test(origin.trim().replace(/\/+$/, ""));
};

export const buildCorsOptions = (currentEnv = env): CorsOptions => ({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, "");

    if (currentEnv.corsOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    if (isVercelPreviewOrigin(normalizedOrigin, currentEnv.allowVercelPreviews, currentEnv.vercelPreviewProject)) {
      callback(null, true);
      return;
    }

    if (!currentEnv.isProduction && /^http:\/\/localhost(:\d+)?$/i.test(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});

export const createApp = (currentEnv = env) => {
  const expressApp = express();
  expressApp.disable("x-powered-by");
  expressApp.set("trust proxy", currentEnv.trustProxy);

  expressApp.use(securityHeadersMiddleware);
  expressApp.use(cors(buildCorsOptions(currentEnv)));
  expressApp.use(express.json({ limit: currentEnv.bodyLimit }));
  expressApp.use(requestTimeoutMiddleware(currentEnv.requestTimeoutMs));

  const generalApiLimiter = createRateLimiter({
    max: currentEnv.rateLimit.apiMax,
    windowMs: currentEnv.rateLimit.apiWindowMs,
    message: "Límite de solicitudes de API excedido. Intenta de nuevo más tarde.",
    errorCode: "API_RATE_LIMIT_EXCEEDED"
  });

  expressApp.get("/health", getLiveness);
  expressApp.use("/api", generalApiLimiter, apiRouter);
  expressApp.use(notFoundHandler);
  expressApp.use(errorHandler);

  return expressApp;
};

export const app = createApp();
export default app;
