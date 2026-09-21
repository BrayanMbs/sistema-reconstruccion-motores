export type CreatePaymentInput = {
  workOrderId: string;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
};

export type UpdateOrderTotalInput = {
  totalAmount: number;
};
