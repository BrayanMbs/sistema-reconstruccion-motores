import type { Request, Response } from "express";
import { AuditService } from "../services/audit.service";
import { limitFromQuery, pageFromQuery } from "../validators/common.validators";
const service = new AuditService();
export const listAuditEvents = async (request: Request, response: Response): Promise<void> => { const page = pageFromQuery(request.query.page); const limit = limitFromQuery(request.query.limit); const asString = (value: unknown) => typeof value === "string" ? value : undefined; const result = await service.list({ userId: asString(request.query.userId), action: asString(request.query.action), from: asString(request.query.from), to: asString(request.query.to), page, limit }); response.json({ ...result, page, limit }); };
