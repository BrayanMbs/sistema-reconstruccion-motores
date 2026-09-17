import type { Request, Response } from "express";
import type { CreatePaymentDto } from "../dtos/admin.dtos";
import { PaymentService } from "../services/payment.service";
import { optionalText, requirePositiveNumber, requireText } from "../validators/common.validators";
const service = new PaymentService();
export const listPayments = async (_request: Request, response: Response): Promise<void> => { response.json({ items: await service.list() }); };
export const createPayment = async (request: Request, response: Response): Promise<void> => { const input: CreatePaymentDto = { workOrderId: requireText(request.body.workOrderId, "Orden"), amount: requirePositiveNumber(request.body.amount, "Monto"), method: requireText(request.body.method, "Método", 40), reference: optionalText(request.body.reference, "Referencia", 120), notes: optionalText(request.body.notes, "Notas", 2000) }; response.status(201).json({ payment: await service.create(input, request.appUser!.id) }); };
