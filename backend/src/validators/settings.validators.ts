import { settingsFields, settingsSections } from "../dtos/settings.dtos";
import type { AppSettings } from "../models/domain";
import { AppError } from "../utils/app-error";
import { requireText } from "./common.validators";

export const SETTINGS_LIMITS = { name: 150, phone: 30, address: 255 } as const;

const invalid = (message: string) => new AppError(message, 422, "VALIDATION_ERROR");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rejectUnexpectedFields = (value: Record<string, unknown>, allowed: readonly string[], prefix = "") => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected !== undefined) {
    throw new AppError(`Campo de configuración no permitido: ${prefix}${unexpected.slice(0, 60)}`, 422, "UNEXPECTED_SETTINGS_FIELD");
  }
};

// Caracteres invisibles (0-31 y 127) que pueden romper pantallas, reportes o comprobantes.
const hasControlCharacters = (value: string, allowLineBreaks = false) =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    if (allowLineBreaks && (code === 10 || code === 13)) return false;
    return code < 32 || code === 127;
  });

const cleanText = (value: string, field: string, allowLineBreaks = false) => {
  if (hasControlCharacters(value, allowLineBreaks)) throw invalid(`${field} contiene caracteres no permitidos`);
  return allowLineBreaks ? value.replace(/\r\n?/g, "\n") : value;
};

const optionalSettingText = (value: unknown, field: string, maxLength: number, allowLineBreaks = false): string => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw invalid(`${field} no es válido`);
  const text = value.trim();
  if (text.length > maxLength) throw invalid(`${field} supera la longitud permitida`);
  return cleanText(text, field, allowLineBreaks);
};

const companyPhone = (value: unknown): string => {
  const phone = optionalSettingText(value, "Teléfono", SETTINGS_LIMITS.phone);
  if (phone && (!/^[0-9+().\- ]+$/.test(phone) || !/\d/.test(phone))) {
    throw invalid("Teléfono solo puede contener números, espacios y los signos + - ( ) .");
  }
  return phone;
};

const financeCurrency = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) throw invalid("Moneda es obligatoria");
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw invalid("Moneda debe ser un código de 3 letras, por ejemplo GTQ");
  return currency;
};

const financeTaxRate = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw invalid("La tasa de impuesto debe ser un número entre 0 y 100");
  }
  if (Math.round(value * 100) / 100 !== value) throw invalid("La tasa de impuesto admite como máximo 2 decimales");
  return value;
};

export const validateSettings = (body: unknown): AppSettings => {
  if (!isPlainObject(body)) throw invalid("Configuración incompleta");
  rejectUnexpectedFields(body, settingsSections);
  const { company, finance } = body;
  if (!isPlainObject(company) || !isPlainObject(finance)) throw invalid("Configuración incompleta");
  rejectUnexpectedFields(company, settingsFields.company, "company.");
  rejectUnexpectedFields(finance, settingsFields.finance, "finance.");

  return {
    company: {
      name: cleanText(requireText(company.name, "Nombre comercial", SETTINGS_LIMITS.name), "Nombre comercial"),
      phone: companyPhone(company.phone),
      address: optionalSettingText(company.address, "Dirección", SETTINGS_LIMITS.address, true)
    },
    finance: {
      currency: financeCurrency(finance.currency),
      taxRate: financeTaxRate(finance.taxRate)
    }
  };
};
