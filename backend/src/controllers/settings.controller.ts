import type { Request, Response } from "express";
import { SettingsService } from "../services/settings.service";
import { validateSettings } from "../validators/settings.validators";

const service = new SettingsService();

export const getSettings = async (_request: Request, response: Response): Promise<void> => {
  response.json({ settings: await service.get() });
};

export const saveSettings = async (request: Request, response: Response): Promise<void> => {
  response.json({ settings: await service.save(validateSettings(request.body), request.appUser!.id) });
};
