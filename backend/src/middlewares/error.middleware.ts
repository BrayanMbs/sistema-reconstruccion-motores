import type { NextFunction, Request, Response } from "express";

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
  console.error(error);
  response.status(500).json({ message: "Error interno del servidor" });
};
