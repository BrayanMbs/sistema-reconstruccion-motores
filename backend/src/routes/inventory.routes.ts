import { Router } from "express";
import { createInventoryEntry, createInventoryExit, createInventoryItem, getInventoryDashboard, getInventoryItem, listActiveInventoryWorkOrders, listInventoryItems, listInventoryMovements, updateInventoryItem, updateInventoryItemStatus } from "../controllers/inventory-v2.controller";
import { requireAuthentication, requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuthentication, requireRole("ADMIN", "INVENTORY"));
inventoryRouter.get("/dashboard", asyncHandler(getInventoryDashboard));
inventoryRouter.get("/work-orders", asyncHandler(listActiveInventoryWorkOrders));
inventoryRouter.get("/items", asyncHandler(listInventoryItems));
inventoryRouter.post("/items", asyncHandler(createInventoryItem));
inventoryRouter.get("/items/:id", asyncHandler(getInventoryItem));
inventoryRouter.patch("/items/:id", asyncHandler(updateInventoryItem));
inventoryRouter.patch("/items/:id/status", asyncHandler(updateInventoryItemStatus));
inventoryRouter.post("/items/:id/entries", asyncHandler(createInventoryEntry));
inventoryRouter.post("/items/:id/exits", asyncHandler(createInventoryExit));
inventoryRouter.get("/movements", asyncHandler(listInventoryMovements));
