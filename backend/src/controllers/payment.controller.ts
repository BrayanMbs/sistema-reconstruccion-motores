import type { Request, Response } from "express";
import { PaymentService } from "../services/payment.service";
import { validatePaymentInput, validateUpdateOrderFinance } from "../validators/finance.validators";
import { requireText } from "../validators/common.validators";

const service = new PaymentService();

export const listPayments = async (request: Request, response: Response): Promise<void> => {
  const workOrderId = typeof request.query.workOrderId === "string" ? request.query.workOrderId : undefined;
  const items = await service.list(workOrderId);
  response.json({ items });
};

export const createPayment = async (request: Request, response: Response): Promise<void> => {
  const input = validatePaymentInput(request.body);
  const result = await service.create(input, request.appUser!.id);
  response.status(201).json(result);
};

export const getOrderFinance = async (request: Request, response: Response): Promise<void> => {
  const orderId = requireText(request.params.id, "Identificador");
  const summary = await service.getFinancialSummary(orderId);
  response.json({ summary });
};

export const updateOrderFinance = async (request: Request, response: Response): Promise<void> => {
  const orderId = requireText(request.params.id, "Identificador");
  const { totalAmount } = validateUpdateOrderFinance(request.body);
  const summary = await service.updateOrderTotal(orderId, totalAmount, request.appUser!.id);
  response.json({ summary });
};

export const getOrderPayments = async (request: Request, response: Response): Promise<void> => {
  const orderId = requireText(request.params.id, "Identificador");
  const items = await service.listByWorkOrder(orderId);
  response.json({ items });
};

export const listOrderFinanceSummaries = async (request: Request, response: Response): Promise<void> => {
  const search = typeof request.query.search === "string" ? request.query.search : undefined;
  const items = await service.listFinancialSummaries(search);
  response.json({ items });
};
