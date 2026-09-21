import type { FinancialStatus } from "../models/domain";
export type CashierOrderFilters = { search?: string; financialStatus?: FinancialStatus; page: number; limit: number };
export type CashierPaymentFilters = { search?: string; method?: string; cashierId?: string; startDate?: string; endDate?: string; page: number; limit: number };
