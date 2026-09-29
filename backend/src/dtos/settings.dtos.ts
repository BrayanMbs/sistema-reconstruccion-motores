import type { AppSettings } from "../models/domain";

export const settingsSections = ["company", "finance"] as const;
export type SettingsSection = (typeof settingsSections)[number];

export const settingsFields = {
  company: ["name", "phone", "address"],
  finance: ["currency", "taxRate"]
} as const satisfies { [Section in SettingsSection]: readonly (keyof AppSettings[Section])[] };

export type SettingsFieldPath = `company.${keyof AppSettings["company"]}` | `finance.${keyof AppSettings["finance"]}`;
export type SettingsChange = { from: string | number; to: string | number };
export type SettingsChanges = Partial<Record<SettingsFieldPath, SettingsChange>>;
export type SettingsAuditDetails = { changes: SettingsChanges };
