import type { Request, Response } from "express";
import { InventoryService } from "../services/inventory.service";
import { requirePositiveNumber, requireText } from "../validators/common.validators";
import { validateCreateInventoryItem } from "../validators/inventory.validators";

const service = new InventoryService();
/** Legacy admin endpoints kept for order assignment compatibility. */
export const listInventory = async (request: Request, response: Response): Promise<void> => { response.json({ items: await service.list(typeof request.query.search === "string" ? request.query.search : undefined) }); };
export const createInventory = async (request: Request, response: Response): Promise<void> => { response.status(201).json({ item: await service.createItem(validateCreateInventoryItem(request.body), request.appUser!.id) }); };
export const listOrderInventory = async (request: Request, response: Response): Promise<void> => { response.json({ items: await service.allocations(requireText(request.params.id, "Orden")) }); };
export const allocateInventory = async (request: Request, response: Response): Promise<void> => { response.json({ items: await service.allocate(requireText(request.params.id, "Orden"), requireText(request.body.inventoryItemId, "Artículo"), requirePositiveNumber(request.body.quantity, "Cantidad"), request.appUser!.id) }); };
export const releaseInventory = async (request: Request, response: Response): Promise<void> => { response.json({ items: await service.release(requireText(request.params.id, "Orden"), requireText(request.params.itemId, "Artículo"), request.appUser!.id) }); };
