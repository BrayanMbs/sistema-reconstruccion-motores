import type { FinancialStatus, OrderFinancialSummary, Payment } from "../models/domain";
export type { FinancialStatus };

export type UpdateOrderFinanceDto = {
  totalAmount: number;
};

export type CreatePaymentDto = {
  workOrderId: string;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
};

export type OrderFinancialSummaryDto = OrderFinancialSummary;

export type OrderFinanceDetailsDto = {
  summary: OrderFinancialSummary;
  payments: Payment[];
};
