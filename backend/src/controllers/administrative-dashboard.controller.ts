import type { Request, Response } from "express";
import { AdministrativeDashboardService } from "../services/administrative-dashboard.service";

const service = new AdministrativeDashboardService();

export const getAdministrativeDashboard = async (_request: Request, response: Response): Promise<void> => {
  response.json(await service.summary());
};
