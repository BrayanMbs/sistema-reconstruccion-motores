import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

export const notFoundHandler = (_request: Request, response: Response): void => {
  response.status(404).json({ message: "Ruta no encontrada" });
};

export const errorHandler = (
  error: Error,
  _request: Request,
  response: Response,
  next: NextFunction
): void => {
  void next;
  if (error instanceof AppError) {
    if (error.statusCode === 429 && error.details?.retryAfter) {
      response.setHeader("Retry-After", String(error.details.retryAfter));
    }
    response.status(error.statusCode).json({ message: error.message, code: error.code, ...(error.details ? error.details : {}) });
    return;
  }

  const errorStatus = (error as { status?: number; type?: string }).status;
  const errorType = (error as { status?: number; type?: string }).type;

  if (errorType === "entity.too.large" || errorStatus === 413) {
    response.status(413).json({
      message: "El tamaño del cuerpo de la solicitud excede el límite permitido",
      code: "PAYLOAD_TOO_LARGE"
    });
    return;
  }

  if (error instanceof SyntaxError && errorStatus === 400 && "body" in error) {
    response.status(400).json({
      message: "Formato JSON inválido",
      code: "INVALID_JSON"
    });
    return;
  }

  console.error(error);
  response.status(500).json({ message: "Error interno del servidor" });
};
