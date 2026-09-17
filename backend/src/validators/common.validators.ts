import { AppError } from "../utils/app-error";

export const requireText = (value: unknown, field: string, maxLength = 255): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} es obligatorio`, 422, "VALIDATION_ERROR");
  }
  if (value.trim().length > maxLength) {
    throw new AppError(`${field} supera la longitud permitida`, 422, "VALIDATION_ERROR");
  }
  return value.trim();
};

export const optionalText = (value: unknown, field: string, maxLength = 1000): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return requireText(value, field, maxLength);
};

export const requireEmail = (value: unknown): string => {
  const email = requireText(value, "Correo", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Correo no válido", 422, "VALIDATION_ERROR");
  }
  return email;
};

export const pageFromQuery = (value: unknown): number => {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const limitFromQuery = (value: unknown): number => {
  const limit = Number(value ?? 20);
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
};
