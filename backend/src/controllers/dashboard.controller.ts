import type { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";
const service = new DashboardService();
export const getDashboard = async (_request: Request, response: Response): Promise<void> => { response.json(await service.summary()); };
