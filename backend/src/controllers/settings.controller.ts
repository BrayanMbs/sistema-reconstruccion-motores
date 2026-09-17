import type { Request, Response } from "express";
import type { AppSettings } from "../models/domain";
import { SettingsService } from "../services/settings.service";
import { AppError } from "../utils/app-error";
import { requireText } from "../validators/common.validators";
const service = new SettingsService();
export const getSettings = async (_request: Request, response: Response): Promise<void> => { response.json({ settings: await service.get() }); };
export const saveSettings = async (request: Request, response: Response): Promise<void> => { const company = request.body.company; const finance = request.body.finance; if (!company || !finance || typeof company !== "object" || typeof finance !== "object") throw new AppError("Configuración incompleta", 422, "VALIDATION_ERROR"); const taxRate = Number(finance.taxRate); if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new AppError("La tasa de impuesto no es válida", 422, "VALIDATION_ERROR"); const settings: AppSettings = { company: { name: requireText(company.name, "Nombre de empresa", 150), phone: typeof company.phone === "string" ? company.phone.trim() : "", address: typeof company.address === "string" ? company.address.trim() : "" }, finance: { currency: requireText(finance.currency, "Moneda", 8).toUpperCase(), taxRate } }; response.json({ settings: await service.save(settings, request.appUser!.id) }); };
