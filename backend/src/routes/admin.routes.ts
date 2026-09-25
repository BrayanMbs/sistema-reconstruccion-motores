import { Router } from "express";
import { listAuditEvents } from "../controllers/audit.controller";
import { createClient, listClients, getClient, updateClient } from "../controllers/client.controller";
import { getDashboard } from "../controllers/dashboard.controller";
import { createUser, getUser, listUsers, resetPassword, updateRole, updateStatus, updateUser } from "../controllers/user.controller";
import { createWorkOrder, getWorkOrder, getWorkOrderHistory, getWorkOrderTimeline, listClientWorkOrders, listWorkOrders, updateWorkOrder } from "../controllers/work-order.controller";
import { assignWorkOrder } from "../controllers/work-order.controller";
import { allocateInventory, createInventory, listInventory, listOrderInventory, releaseInventory } from "../controllers/inventory.controller";
import {
  createPayment,
  getOrderFinance,
  getOrderPayments,
  listOrderFinanceSummaries,
  listPayments,
  updateOrderFinance
} from "../controllers/payment.controller";
import { listOperators } from "../controllers/operators.controller";
import { getReportsSummary } from "../controllers/reports.controller";
import { getSettings, saveSettings } from "../controllers/settings.controller";
import { requireAuthentication, requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
export const adminRouter = Router();
adminRouter.use(requireAuthentication, requireRole("ADMIN"));
adminRouter.get("/dashboard", asyncHandler(getDashboard));
adminRouter.route("/users").get(asyncHandler(listUsers)).post(asyncHandler(createUser));
adminRouter.route("/users/:id").get(asyncHandler(getUser)).patch(asyncHandler(updateUser));
adminRouter.patch("/users/:id/role", asyncHandler(updateRole)); adminRouter.patch("/users/:id/status", asyncHandler(updateStatus));
adminRouter.post("/users/:id/reset-password", asyncHandler(resetPassword));
adminRouter.route("/clients").get(asyncHandler(listClients)).post(asyncHandler(createClient)); adminRouter.route("/clients/:id").get(asyncHandler(getClient)).put(asyncHandler(updateClient)); adminRouter.get("/clients/:id/work-orders", asyncHandler(listClientWorkOrders));
adminRouter.route("/work-orders").get(asyncHandler(listWorkOrders)).post(asyncHandler(createWorkOrder)); adminRouter.route("/work-orders/:id").get(asyncHandler(getWorkOrder)).put(asyncHandler(updateWorkOrder)); adminRouter.get("/work-orders/:id/history", asyncHandler(getWorkOrderHistory)); adminRouter.get("/work-orders/:id/timeline", asyncHandler(getWorkOrderTimeline)); adminRouter.patch("/work-orders/:id/assignee", asyncHandler(assignWorkOrder));
adminRouter.route("/work-orders/:id/finance").get(asyncHandler(getOrderFinance)).patch(asyncHandler(updateOrderFinance));
adminRouter.get("/work-orders/:id/payments", asyncHandler(getOrderPayments));
adminRouter.get("/operators", asyncHandler(listOperators));
adminRouter.route("/inventory").get(asyncHandler(listInventory)).post(asyncHandler(createInventory));
adminRouter.get("/work-orders/:id/inventory", asyncHandler(listOrderInventory)); adminRouter.post("/work-orders/:id/inventory", asyncHandler(allocateInventory)); adminRouter.delete("/work-orders/:id/inventory/:itemId", asyncHandler(releaseInventory));
adminRouter.get("/finance/orders", asyncHandler(listOrderFinanceSummaries));
adminRouter.route("/payments").get(asyncHandler(listPayments)).post(asyncHandler(createPayment));
adminRouter.get("/reports/summary", asyncHandler(getReportsSummary));
adminRouter.route("/settings").get(asyncHandler(getSettings)).put(asyncHandler(saveSettings));
adminRouter.get("/audit", asyncHandler(listAuditEvents));
