import type { Request, Response } from "express";
import { OperatorsService } from "../services/operators.service";
const service = new OperatorsService();
export const listOperators = async (_request: Request, response: Response): Promise<void> => { response.json({ items: await service.list() }); };
