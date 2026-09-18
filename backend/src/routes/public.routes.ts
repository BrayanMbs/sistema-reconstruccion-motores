import { Router } from "express";
import { findPublicOrderTracking } from "../controllers/public-tracking.controller";
import { createPublicTrackingRateLimiter } from "../middlewares/public-tracking-rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler";

export const publicRouter = Router();
publicRouter.post("/orders/tracking", createPublicTrackingRateLimiter(), asyncHandler(findPublicOrderTracking));
