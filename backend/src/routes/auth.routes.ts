import { Router } from "express";
import { env } from "../config/env";
import { changeTemporaryPassword, currentUser, login } from "../controllers/auth.controller";
import { requireAuthentication } from "../middlewares/auth.middleware";
import { createRateLimiter } from "../middlewares/rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler";

export const authRouter = Router();

const authLoginRateLimiter = createRateLimiter({
  max: env.auth.ipRateLimitMax,
  windowMs: env.auth.ipRateLimitWindowMs,
  message: "Demasiados intentos de autenticación desde esta dirección IP. Intenta de nuevo más tarde.",
  errorCode: "AUTH_RATE_LIMIT_EXCEEDED"
});

authRouter.post("/login", authLoginRateLimiter, asyncHandler(login));
authRouter.get("/me", requireAuthentication, asyncHandler(currentUser));
authRouter.post("/change-temporary-password", requireAuthentication, asyncHandler(changeTemporaryPassword));
