import type { AppSettings } from "@/shared/models/admin";

// Valores tal como se escriben en el formulario: el impuesto queda como texto hasta validarlo.
export type SettingsForm = {
  company: { name: string; phone: string; address: string };
  finance: { currency: string; taxRate: string };
};
export type SettingsPayload = AppSettings;
export type SettingsResponse = { settings: AppSettings };
