import type { Request, Response } from "express";
import { ReportsService } from "../services/reports.service";
const service = new ReportsService();
export const getReportsSummary = async (_request: Request, response: Response): Promise<void> => { response.json({ report: await service.summary() }); };
