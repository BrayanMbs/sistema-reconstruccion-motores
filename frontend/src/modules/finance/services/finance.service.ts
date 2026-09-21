import type { OrderFinancialSummary, Payment, WorkOrder } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import type { CreatePaymentInput, UpdateOrderTotalInput } from "../dtos/finance.dto";

export const financeService = {
  async listPayments(workOrderId?: string): Promise<Payment[]> {
    const query = workOrderId ? `?workOrderId=${encodeURIComponent(workOrderId)}` : "";
    const data = await apiRequest<{ items: Payment[] }>(`/api/admin/payments${query}`);
    return data.items;
  },

  async listOrders(): Promise<WorkOrder[]> {
    const data = await apiRequest<{ items: WorkOrder[] }>("/api/admin/work-orders?limit=100");
    return data.items;
  },

  async listOrderFinanceSummaries(search?: string): Promise<OrderFinancialSummary[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await apiRequest<{ items: OrderFinancialSummary[] }>(`/api/admin/finance/orders${query}`);
    return data.items;
  },

  async getOrderFinance(orderId: string): Promise<OrderFinancialSummary> {
    const data = await apiRequest<{ summary: OrderFinancialSummary }>(`/api/admin/work-orders/${orderId}/finance`);
    return data.summary;
  },

  async updateOrderTotal(orderId: string, input: UpdateOrderTotalInput): Promise<OrderFinancialSummary> {
    const data = await apiRequest<{ summary: OrderFinancialSummary }>(`/api/admin/work-orders/${orderId}/finance`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    return data.summary;
  },

  async createPayment(input: CreatePaymentInput): Promise<{ payment: Payment; summary: OrderFinancialSummary }> {
    return apiRequest<{ payment: Payment; summary: OrderFinancialSummary }>("/api/admin/payments", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
