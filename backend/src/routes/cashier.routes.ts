import { Router } from "express";
import { cashierCreatePayment,cashierDashboard,cashierDailySummary,cashierOrders,cashierPayment,cashierPayments } from "../controllers/cashier.controller";
import { requireAuthentication,requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
export const cashierRouter=Router();cashierRouter.use(requireAuthentication,requireRole("ADMIN","CASHIER"));cashierRouter.get("/dashboard",asyncHandler(cashierDashboard));cashierRouter.get("/orders",asyncHandler(cashierOrders));cashierRouter.get("/payments",asyncHandler(cashierPayments));cashierRouter.get("/payments/:id",asyncHandler(cashierPayment));cashierRouter.post("/payments",asyncHandler(cashierCreatePayment));cashierRouter.get("/daily-summary",asyncHandler(cashierDailySummary));
