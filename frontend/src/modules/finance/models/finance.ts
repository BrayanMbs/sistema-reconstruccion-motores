import type { FinancialStatus, OrderFinancialSummary, Payment } from "@/shared/models/admin";

export type { FinancialStatus, OrderFinancialSummary, Payment };

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Pago parcial",
  PAID: "Pagado"
};

export const FINANCIAL_STATUS_BADGE_CLASSES: Record<FinancialStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  PARTIAL: "bg-blue-100 text-blue-800 border-blue-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200"
};
