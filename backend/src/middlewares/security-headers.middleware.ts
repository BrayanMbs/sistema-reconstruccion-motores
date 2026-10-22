import type { RequestHandler } from "express";
import { env } from "../config/env";

export const securityHeadersMiddleware: RequestHandler = (_request, response, next) => {
  response.removeHeader("X-Powered-By");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-XSS-Protection", "0");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

  if (env.isProduction) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
};

