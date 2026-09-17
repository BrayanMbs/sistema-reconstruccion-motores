import type { Request, Response } from "express";
import { ClientService } from "../services/client.service";
import { limitFromQuery, pageFromQuery, requireText } from "../validators/common.validators";
const service = new ClientService();
export const listClients = async (request: Request, response: Response): Promise<void> => { const page = pageFromQuery(request.query.page); const limit = limitFromQuery(request.query.limit); const result = await service.list(typeof request.query.search === "string" ? request.query.search : undefined, typeof request.query.identificationType === "string" ? request.query.identificationType : undefined, page, limit); response.json({ ...result, page, limit }); };
export const getClient = async (request: Request, response: Response): Promise<void> => { response.json({ client: await service.get(requireText(request.params.id, "Identificador")) }); };
