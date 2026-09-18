import type { Request, Response } from "express";
import type { CreateWorkOrderDto, UpdateWorkOrderDto } from "../dtos/admin.dtos";
import { AppError } from "../utils/app-error";
import { WorkOrderService } from "../services/work-order.service";
import { limitFromQuery, optionalDate, optionalText, pageFromQuery, requireText } from "../validators/common.validators";
const service = new WorkOrderService();
export const listWorkOrders = async (request: Request, response: Response): Promise<void> => { const page = pageFromQuery(request.query.page); const limit = limitFromQuery(request.query.limit); const result = await service.list({ search: typeof request.query.search === "string" ? request.query.search : undefined, status: typeof request.query.status === "string" ? request.query.status : undefined, page, limit }); response.json({ ...result, page, limit }); };
export const getWorkOrder = async (request: Request, response: Response): Promise<void> => { response.json({ order: await service.get(requireText(request.params.id, "Identificador")) }); };
const orderFields = (body: Record<string, unknown>): UpdateWorkOrderDto => {
  const priority = body.priority;
  if (priority !== undefined && priority !== "NORMAL" && priority !== "HIGH" && priority !== "URGENT") {
    throw new AppError("Prioridad no válida", 422, "VALIDATION_ERROR");
  }
  return {
    engineBrand: requireText(body.engineBrand, "Marca del motor"),
    engineModel: requireText(body.engineModel, "Modelo del motor"),
    engineSerial: optionalText(body.engineSerial, "Serie"),
    serviceType: requireText(body.serviceType, "Servicio"),
    description: requireText(body.description, "Descripción", 2000),
    estimatedDate: optionalDate(body.estimatedDate, "Fecha estimada"),
    intakeNotes: optionalText(body.intakeNotes, "Notas de recepción", 2000),
    publicNote: optionalText(body.publicNote, "Nota pública", 2000),
    priority
  };
};
export const createWorkOrder = async (request: Request, response: Response): Promise<void> => { const input: CreateWorkOrderDto = { clientId: requireText(request.body.clientId, "Cliente"), ...orderFields(request.body) }; response.status(201).json({ order: await service.create(input, request.appUser!.id) }); };
export const updateWorkOrder = async (request: Request, response: Response): Promise<void> => { response.json({ order: await service.update(requireText(request.params.id, "Orden"), orderFields(request.body), request.appUser!.id) }); };
export const getWorkOrderHistory = async (request: Request, response: Response): Promise<void> => { response.json({ items: await service.history(requireText(request.params.id, "Orden")) }); };
export const listClientWorkOrders = async (request: Request, response: Response): Promise<void> => { response.json({ items: await service.listByClient(requireText(request.params.id, "Cliente")) }); };
export const assignWorkOrder = async (request: Request, response: Response): Promise<void> => { response.json({ order: await service.assignWorker(requireText(request.params.id, "Orden"), requireText(request.body.workerId, "Trabajador"), request.appUser!.id) }); };
