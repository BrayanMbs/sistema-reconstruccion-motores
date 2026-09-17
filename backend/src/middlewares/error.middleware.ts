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
    response.status(error.statusCode).json({ message: error.message, code: error.code });
    return;
  }

  console.error(error);
  response.status(500).json({ message: "Error interno del servidor" });
};
