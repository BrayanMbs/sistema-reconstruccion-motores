import type { AppSettings } from "@/shared/models/admin";
import type { SettingsForm } from "../dtos/settings.dto";

export type { AppSettings };
export type SettingsField = "name" | "phone" | "address" | "currency" | "taxRate";
export type SettingsErrors = Partial<Record<SettingsField, string>>;

// Mismos límites que aplica el backend, que sigue siendo la validación definitiva.
export const SETTINGS_LIMITS = { name: 150, phone: 30, address: 255 } as const;

export const validateSettingsForm = (form: SettingsForm): SettingsErrors => {
  const errors: SettingsErrors = {};
  const name = form.company.name.trim();
  const phone = form.company.phone.trim();
  const taxRate = form.finance.taxRate.trim();

  if (!name) errors.name = "El nombre comercial es obligatorio.";
  else if (name.length > SETTINGS_LIMITS.name) errors.name = `Use como máximo ${SETTINGS_LIMITS.name} caracteres.`;

  if (phone.length > SETTINGS_LIMITS.phone) errors.phone = `Use como máximo ${SETTINGS_LIMITS.phone} caracteres.`;
  else if (phone && (!/^[0-9+().\- ]+$/.test(phone) || !/\d/.test(phone))) errors.phone = "Use solo números, espacios y los signos + - ( ) .";

  if (form.company.address.trim().length > SETTINGS_LIMITS.address) errors.address = `Use como máximo ${SETTINGS_LIMITS.address} caracteres.`;

  if (!/^[A-Za-z]{3}$/.test(form.finance.currency.trim())) errors.currency = "Use un código de 3 letras, por ejemplo GTQ.";

  if (!/^\d{1,3}(\.\d{1,2})?$/.test(taxRate) || Number(taxRate) > 100) {
    errors.taxRate = "Ingrese un porcentaje entre 0 y 100, con hasta 2 decimales.";
  }
  return errors;
};

export const hasSettingsErrors = (errors: SettingsErrors) => Object.values(errors).some(Boolean);

export const sameSettings = (first: AppSettings, second: AppSettings) =>
  first.company.name === second.company.name &&
  first.company.phone === second.company.phone &&
  first.company.address === second.company.address &&
  first.finance.currency === second.finance.currency &&
  first.finance.taxRate === second.finance.taxRate;
