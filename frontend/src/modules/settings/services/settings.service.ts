import { apiRequest } from "@/shared/services/api";
import type { SettingsPayload, SettingsResponse } from "../dtos/settings.dto";

export const settingsService = {
  get: async () => (await apiRequest<SettingsResponse>("/api/admin/settings")).settings,
  save: async (settings: SettingsPayload) =>
    (await apiRequest<SettingsResponse>("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) })).settings
};
