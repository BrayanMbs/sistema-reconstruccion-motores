import type { AppSettings } from "../models/domain";
import { SettingsRepository } from "../repositories/settings.repository";
import { AuditService } from "./audit.service";
export class SettingsService { private readonly settings = new SettingsRepository(); private readonly audit = new AuditService(); get() { return this.settings.get(); } async save(settings: AppSettings, actorId: string) { const updated = await this.settings.save(settings, actorId); await this.audit.record(actorId, "SETTINGS_UPDATED", "SETTINGS", undefined, {}); return updated; } }
