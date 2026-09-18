import type { Request, Response } from "express";
import { PublicTrackingService } from "../services/public-tracking.service";
import { parsePublicTrackingQuery } from "../validators/public-tracking.validators";

const service = new PublicTrackingService();

export const findPublicOrderTracking = async (request: Request, response: Response): Promise<void> => {
  const tracking = await service.find(parsePublicTrackingQuery(request.body));
  response.json({ tracking });
};
