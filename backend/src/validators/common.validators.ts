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

export const optionalDate = (value: unknown, field: string): string | null => {
  const date = optionalText(value, field, 10);
  if (date === null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new AppError(`${field} debe tener formato YYYY-MM-DD`, 422, "VALIDATION_ERROR");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new AppError(`${field} no es una fecha válida`, 422, "VALIDATION_ERROR");
  }
  return date;
};

export const requireEmail = (value: unknown): string => {
  const email = requireText(value, "Correo", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Correo no válido", 422, "VALIDATION_ERROR");
  }
  return email;
};

export const requirePositiveNumber = (value: unknown, field: string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new AppError(`${field} debe ser un número mayor que cero`, 422, "VALIDATION_ERROR");
  return parsed;
};

export const pageFromQuery = (value: unknown): number => {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const limitFromQuery = (value: unknown): number => {
  const limit = Number(value ?? 20);
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
};
