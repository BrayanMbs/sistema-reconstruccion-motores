import type { NextFunction, Request, Response } from "express";
import type { Role } from "../models/domain";
import { AuthService } from "../services/auth.service";
import { AppError } from "../utils/app-error";

const authService = new AuthService();

export const requireAuthentication = async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
  try {
    const authorization = request.header("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new AppError("Se requiere una sesión válida", 401, "AUTH_REQUIRED");
    request.appUser = await authService.authenticateToken(authorization.slice(7));
    next();
  } catch (error) { next(error); }
};

export const requireRole = (...allowedRoles: Role[]) => (request: Request, _response: Response, next: NextFunction): void => {
  if (!request.appUser) { next(new AppError("Se requiere una sesión válida", 401, "AUTH_REQUIRED")); return; }
  if (request.appUser.mustChangePassword) { next(new AppError("Debes cambiar tu contraseña temporal para continuar", 403, "PASSWORD_CHANGE_REQUIRED")); return; }
  if (!allowedRoles.includes(request.appUser.role)) { next(new AppError("No tienes permiso para este recurso", 403, "INSUFFICIENT_ROLE")); return; }
  next();
};
