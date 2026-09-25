import { Router } from "express";
import { activity, complete, dashboard, getHistory, getOrder, getTimeline, listOrders, markNotificationRead, notifications, start, updateProgress } from "../controllers/operational.controller";
import { requireAuthentication, requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const operationalRouter = Router();
operationalRouter.use(requireAuthentication, requireRole("OPERATOR"));
operationalRouter.get("/dashboard", asyncHandler(dashboard));
operationalRouter.get("/orders", asyncHandler(listOrders));
operationalRouter.get("/orders/:id", asyncHandler(getOrder));
operationalRouter.get("/orders/:id/history", asyncHandler(getHistory));
operationalRouter.get("/orders/:id/timeline", asyncHandler(getTimeline));
operationalRouter.post("/orders/:id/start", asyncHandler(start));
operationalRouter.patch("/orders/:id/progress", asyncHandler(updateProgress));
operationalRouter.post("/orders/:id/complete", asyncHandler(complete));
operationalRouter.get("/activity", asyncHandler(activity));
operationalRouter.get("/notifications", asyncHandler(notifications));
operationalRouter.patch("/notifications/:id/read", asyncHandler(markNotificationRead));
