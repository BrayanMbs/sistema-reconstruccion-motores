import type { SettingsForm, SettingsPayload } from "../dtos/settings.dto";
import type { AppSettings } from "../models/settings";

export const toSettingsForm = (settings: AppSettings): SettingsForm => ({
  company: { name: settings.company.name, phone: settings.company.phone, address: settings.company.address },
  finance: { currency: settings.finance.currency, taxRate: String(settings.finance.taxRate) }
});

export const toSettingsPayload = (form: SettingsForm): SettingsPayload => ({
  company: { name: form.company.name.trim(), phone: form.company.phone.trim(), address: form.company.address.trim() },
  finance: { currency: form.finance.currency.trim().toUpperCase(), taxRate: Number(form.finance.taxRate.trim()) }
});
