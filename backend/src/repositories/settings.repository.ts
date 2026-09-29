import type { PoolClient } from "pg";
import { databasePool } from "../config/database";
import type { AppSettings } from "../models/domain";

export const DEFAULT_SETTINGS: AppSettings = {
  company: { name: "Motor Repair", phone: "", address: "" },
  finance: { currency: "GTQ", taxRate: 0 }
};

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const textOr = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);

// Solo expone los campos conocidos del contrato, aunque la fila guarde otras claves.
const mapSettings = (rows: { setting_key: string; value: unknown }[]): AppSettings => {
  const stored = Object.fromEntries(rows.map((row) => [row.setting_key, asObject(row.value)]));
  const company = stored.company ?? {};
  const finance = stored.finance ?? {};
  const taxRate = Number(finance.taxRate);
  return {
    company: {
      name: textOr(company.name, DEFAULT_SETTINGS.company.name),
      phone: textOr(company.phone, DEFAULT_SETTINGS.company.phone),
      address: textOr(company.address, DEFAULT_SETTINGS.company.address)
    },
    finance: {
      currency: textOr(finance.currency, DEFAULT_SETTINGS.finance.currency),
      taxRate: Number.isFinite(taxRate) ? taxRate : DEFAULT_SETTINGS.finance.taxRate
    }
  };
};

export class SettingsRepository {
  async get(client?: PoolClient, options: { lock?: boolean } = {}): Promise<AppSettings> {
    const executor = client ?? databasePool;
    const result = await executor.query(
      `SELECT setting_key, value FROM app_settings WHERE setting_key IN ('company', 'finance')${options.lock ? " FOR UPDATE" : ""}`
    );
    return mapSettings(result.rows);
  }

  async save(sections: Partial<AppSettings>, actorId: string, client?: PoolClient): Promise<void> {
    const executor = client ?? databasePool;
    for (const [key, value] of Object.entries(sections)) {
      await executor.query(
        "INSERT INTO app_settings (setting_key, value, updated_by) VALUES ($1, $2::jsonb, $3) ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()",
        [key, JSON.stringify(value), actorId]
      );
    }
  }
}
