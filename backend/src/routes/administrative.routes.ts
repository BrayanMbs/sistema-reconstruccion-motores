import { Router } from "express";
import { getAdministrativeDashboard } from "../controllers/administrative-dashboard.controller";
import { createClient, getClient, listClients, updateClient } from "../controllers/client.controller";
import { listOperators } from "../controllers/operators.controller";
import { assignWorkOrder, createWorkOrder, getWorkOrder, getWorkOrderHistory, getWorkOrderTimeline, listClientWorkOrders, listWorkOrders, updateWorkOrder } from "../controllers/work-order.controller";
import { requireAuthentication, requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const administrativeRouter = Router();

administrativeRouter.use(requireAuthentication, requireRole("ADMINISTRATIVE"));
administrativeRouter.get("/dashboard", asyncHandler(getAdministrativeDashboard));
administrativeRouter.route("/clients").get(asyncHandler(listClients)).post(asyncHandler(createClient));
administrativeRouter.route("/clients/:id").get(asyncHandler(getClient)).put(asyncHandler(updateClient));
administrativeRouter.get("/clients/:id/work-orders", asyncHandler(listClientWorkOrders));
administrativeRouter.route("/work-orders").get(asyncHandler(listWorkOrders)).post(asyncHandler(createWorkOrder));
administrativeRouter.route("/work-orders/:id").get(asyncHandler(getWorkOrder)).put(asyncHandler(updateWorkOrder));
administrativeRouter.get("/work-orders/:id/history", asyncHandler(getWorkOrderHistory));
administrativeRouter.get("/work-orders/:id/timeline", asyncHandler(getWorkOrderTimeline));
administrativeRouter.patch("/work-orders/:id/assignee", asyncHandler(assignWorkOrder));
administrativeRouter.get("/operators", asyncHandler(listOperators));
