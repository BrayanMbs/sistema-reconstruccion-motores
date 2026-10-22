import type { RequestHandler } from "express";
import { env } from "../config/env";

export const requestTimeoutMiddleware = (timeoutMs = env.requestTimeoutMs): RequestHandler => {
  return (request, response, next) => {
    const timer = setTimeout(() => {
      if (!response.headersSent) {
        response.status(504).json({
          message: "Tiempo de espera de la solicitud agotado",
          code: "REQUEST_TIMEOUT"
        });
      }
    }, timeoutMs);

    if (typeof timer.unref === "function") {
      timer.unref();
    }

    const clear = () => clearTimeout(timer);
    response.on("finish", clear);
    response.on("close", clear);

    next();
  };
};

