import type { Request, Response } from "express";
import { InventoryService } from "../services/inventory.service";
import { requireText } from "../validators/common.validators";
import { inventoryListFilters, inventoryMovementFilters, validateCreateInventoryItem, validateMovement, validateStatus, validateUpdateInventoryItem } from "../validators/inventory.validators";

const service = new InventoryService();
export const getInventoryDashboard = async (_request: Request, response: Response): Promise<void> => { response.json({ dashboard: await service.dashboard() }); };
export const listInventoryItems = async (request: Request, response: Response): Promise<void> => { response.json(await service.listItems(inventoryListFilters(request.query))); };
export const createInventoryItem = async (request: Request, response: Response): Promise<void> => { response.status(201).json({ item: await service.createItem(validateCreateInventoryItem(request.body), request.appUser!.id) }); };
export const getInventoryItem = async (request: Request, response: Response): Promise<void> => { response.json({ item: await service.getItem(requireText(request.params.id, "Producto")) }); };
export const updateInventoryItem = async (request: Request, response: Response): Promise<void> => { response.json({ item: await service.updateItem(requireText(request.params.id, "Producto"), validateUpdateInventoryItem(request.body), request.appUser!.id) }); };
export const updateInventoryItemStatus = async (request: Request, response: Response): Promise<void> => { response.json({ item: await service.setStatus(requireText(request.params.id, "Producto"), validateStatus(request.body), request.appUser!.id) }); };
export const createInventoryEntry = async (request: Request, response: Response): Promise<void> => { response.status(201).json({ movement: await service.entry(requireText(request.params.id, "Producto"), validateMovement(request.body, "ENTRY"), request.appUser!.id) }); };
export const createInventoryExit = async (request: Request, response: Response): Promise<void> => { response.status(201).json({ movement: await service.exit(requireText(request.params.id, "Producto"), validateMovement(request.body, "EXIT"), request.appUser!.id) }); };
export const listInventoryMovements = async (request: Request, response: Response): Promise<void> => { response.json(await service.movements(inventoryMovementFilters(request.query))); };
export const listActiveInventoryWorkOrders = async (_request: Request, response: Response): Promise<void> => { response.json({ items: await service.activeWorkOrders() }); };
