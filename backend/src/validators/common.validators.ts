import { AppError } from "../utils/app-error";

export interface TextValidationOptions {
  allowMultiline?: boolean;
  minLength?: number;
  allowRawText?: boolean;
}

// eslint-disable-next-line no-control-regex
const ILLEGAL_CONTROL_CHARS_SINGLE_LINE = /[\x00-\x1F\x7F]/;
// eslint-disable-next-line no-control-regex
const ILLEGAL_CONTROL_CHARS_MULTI_LINE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

const SQL_INJECTION_PATTERNS = [
  /(?:'|")\s*(?:OR|AND)\s*(?:'|"|\d|true|false|\w)/i,
  /\b(?:OR|AND)\s+['"\w\d]+\s*=\s*['"\w\d]+/i,
  /\b(?:OR|AND)\s+\d+\s*=\s*\d+/i,
  /(?:'|")\s*=\s*(?:'|")/,
  /(?:--|\/\*|\*\/)/,
  /;\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b/i,
  /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
  /\b(?:DROP|TRUNCATE|ALTER)\s+TABLE\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bDELETE\s+FROM\b/i,
  /\b(?:SLEEP|BENCHMARK|PG_SLEEP|WAITFOR\s+DELAY)\s*\(/i,
  /0x[0-9a-fA-F]{4,}/
];

export const hasSqlInjectionPattern = (value: string): boolean => {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
};

const XSS_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<svg\b/i,
  /<img\b[^>]*\bonerror\b/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /\bon\w+\s*=\s*['"][^'"]*['"]/i
];

export const hasXssPattern = (value: string): boolean => {
  return XSS_PATTERNS.some((pattern) => pattern.test(value));
};

export const hasControlCharacters = (value: string, allowMultiline = false): boolean => {
  return allowMultiline
    ? ILLEGAL_CONTROL_CHARS_MULTI_LINE.test(value)
    : ILLEGAL_CONTROL_CHARS_SINGLE_LINE.test(value);
};

export const sanitizeText = (value: string, options: TextValidationOptions = {}): string => {
  const normalized = value.normalize("NFC");
  if (options.allowMultiline) {
    return normalized.replace(/\r\n?/g, "\n").trim();
  }
  return normalized.trim();
};

export const requireText = (
  value: unknown,
  field: string,
  maxLength = 255,
  options: TextValidationOptions = {}
): string => {
  if (typeof value !== "string") {
    throw new AppError(`${field} es obligatorio`, 422, "VALIDATION_ERROR");
  }
  const normalized = value.normalize("NFC");
  if (hasControlCharacters(normalized, options.allowMultiline)) {
    throw new AppError(`${field} contiene caracteres no permitidos`, 422, "VALIDATION_ERROR");
  }
  if (!options.allowRawText) {
    if (hasSqlInjectionPattern(normalized)) {
      throw new AppError(`${field} contiene caracteres o patrones no permitidos`, 422, "VALIDATION_ERROR");
    }
    if (hasXssPattern(normalized)) {
      throw new AppError(`${field} contiene código o etiquetas no permitidas`, 422, "VALIDATION_ERROR");
    }
  }
  const cleaned = sanitizeText(normalized, options);
  if (cleaned.length === 0) {
    throw new AppError(`${field} es obligatorio`, 422, "VALIDATION_ERROR");
  }
  if (options.minLength !== undefined && cleaned.length < options.minLength) {
    throw new AppError(`${field} debe tener al menos ${options.minLength} caracteres`, 422, "VALIDATION_ERROR");
  }
  if (cleaned.length > maxLength) {
    throw new AppError(`${field} supera la longitud permitida`, 422, "VALIDATION_ERROR");
  }
  return cleaned;
};

const PERSON_NAME_ALLOWED = /^[\p{L}\s.\-']{2,180}$/u;

export const requirePersonName = (
  value: unknown,
  field = "Nombre completo",
  maxLength = 180
): string => {
  const text = requireText(value, field, maxLength);
  if (!PERSON_NAME_ALLOWED.test(text)) {
    throw new AppError(`${field} solo puede contener letras, espacios, puntos, guiones o apóstrofos`, 422, "VALIDATION_ERROR");
  }
  if (/[-.']{2,}/.test(text)) {
    throw new AppError(`${field} contiene caracteres repetidos no válidos`, 422, "VALIDATION_ERROR");
  }
  if (/^[-.']|[-.']$/.test(text)) {
    throw new AppError(`${field} no puede iniciar ni terminar con puntuación`, 422, "VALIDATION_ERROR");
  }
  const letterCount = (text.match(/\p{L}/gu) || []).length;
  if (letterCount < 2) {
    throw new AppError(`${field} debe contener al menos dos letras`, 422, "VALIDATION_ERROR");
  }
  return text;
};

export const sanitizeSearchQuery = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (hasControlCharacters(trimmed) || hasSqlInjectionPattern(trimmed) || hasXssPattern(trimmed)) {
    throw new AppError("El término de búsqueda contiene patrones no permitidos", 422, "VALIDATION_ERROR");
  }
  return trimmed.slice(0, 100);
};

export const optionalText = (
  value: unknown,
  field: string,
  maxLength = 1000,
  options: TextValidationOptions = {}
): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return requireText(value, field, maxLength, options);
};

export const requireUuid = (value: unknown, field: string): string => {
  const id = requireText(value, field, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError(`${field} no es válido`, 422, "VALIDATION_ERROR");
  }
  return id;
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

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const requireEmail = (value: unknown): string => {
  const email = requireText(value, "Correo", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.includes("..")) {
    throw new AppError("Correo no válido", 422, "VALIDATION_ERROR");
  }
  return email;
};

const PHONE_PATTERN = /^\+?[0-9\s\-().]{7,40}$/;

export const requirePhone = (value: unknown, field = "Teléfono"): string => {
  const phone = requireText(value, field, 40);
  if (!PHONE_PATTERN.test(phone) || !/\d/.test(phone)) {
    throw new AppError(`${field} no es un número de teléfono válido`, 422, "VALIDATION_ERROR");
  }
  return phone;
};

export const optionalPhone = (value: unknown, field = "Teléfono"): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return requirePhone(value, field);
};

const IDENTIFICATION_PATTERN = /^[A-Za-z0-9\s\-/.]{2,80}$/;

export const requireIdentification = (value: unknown, field = "Identificación"): string => {
  const id = requireText(value, field, 80);
  if (!IDENTIFICATION_PATTERN.test(id) || !/[A-Za-z0-9]/.test(id)) {
    throw new AppError(`${field} no tiene un formato válido`, 422, "VALIDATION_ERROR");
  }
  return id;
};

const ALPHANUMERIC_CODE_PATTERN = /^[A-Za-z0-9\-_.]+$/;

export const requireAlphaNumericCode = (value: unknown, field = "Código", maxLength = 80): string => {
  const code = requireText(value, field, maxLength);
  if (!ALPHANUMERIC_CODE_PATTERN.test(code) || code.includes("..")) {
    throw new AppError(`${field} solo puede contener caracteres alfanuméricos, guiones o puntos`, 422, "VALIDATION_ERROR");
  }
  return code;
};

export const requirePositiveNumber = (value: unknown, field: string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${field} debe ser un número mayor que cero`, 422, "VALIDATION_ERROR");
  }
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

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#x2F;");
