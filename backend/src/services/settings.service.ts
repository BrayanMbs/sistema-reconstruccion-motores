import { databasePool } from "../config/database";
import type { SettingsAuditDetails, SettingsChanges, SettingsFieldPath, SettingsSection } from "../dtos/settings.dtos";
import type { AppSettings } from "../models/domain";
import { SettingsRepository } from "../repositories/settings.repository";
import { AuditService } from "./audit.service";

// Lista cerrada de campos auditables: la auditoría nunca registra algo fuera del contrato.
const flattenSettings = (settings: AppSettings): Record<SettingsFieldPath, string | number> => ({
  "company.name": settings.company.name,
  "company.phone": settings.company.phone,
  "company.address": settings.company.address,
  "finance.currency": settings.finance.currency,
  "finance.taxRate": settings.finance.taxRate
});

export const settingsChanges = (previous: AppSettings, next: AppSettings): SettingsChanges => {
  const before = flattenSettings(previous);
  const after = flattenSettings(next);
  const changes: SettingsChanges = {};
  for (const path of Object.keys(after) as SettingsFieldPath[]) {
    if (before[path] !== after[path]) changes[path] = { from: before[path], to: after[path] };
  }
  return changes;
};

const changedSections = (settings: AppSettings, changes: SettingsChanges): Partial<AppSettings> => {
  const paths = Object.keys(changes);
  const touches = (section: SettingsSection) => paths.some((path) => path.startsWith(`${section}.`));
  return {
    ...(touches("company") ? { company: settings.company } : {}),
    ...(touches("finance") ? { finance: settings.finance } : {})
  };
};

export class SettingsService {
  private readonly settings = new SettingsRepository();
  private readonly audit = new AuditService();

  get() {
    return this.settings.get();
  }

  async save(settings: AppSettings, actorId: string): Promise<AppSettings> {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      const previous = await this.settings.get(client, { lock: true });
      const changes = settingsChanges(previous, settings);
      if (Object.keys(changes).length === 0) {
        await client.query("COMMIT");
        return previous;
      }
      const details: SettingsAuditDetails = { changes };
      await this.settings.save(changedSections(settings, changes), actorId, client);
      await this.audit.record(actorId, "SETTINGS_UPDATED", "SETTINGS", undefined, details, client);
      const updated = await this.settings.get(client);
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
