import type { CreatePaymentDto } from "../dtos/finance.dtos";
import type { OrderFinancialSummary, Payment } from "../models/domain";
import { PaymentRepository } from "../repositories/payment.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";
import { AppError } from "../utils/app-error";
import { AuditService } from "./audit.service";

export class PaymentService {
  private readonly payments = new PaymentRepository();
  private readonly orders = new WorkOrderRepository();
  private readonly audit = new AuditService();

  async list(workOrderId?: string): Promise<Payment[]> {
    return this.payments.list(workOrderId);
  }

  async listByWorkOrder(workOrderId: string): Promise<Payment[]> {
    const order = await this.orders.findById(workOrderId);
    if (!order) {
      throw new AppError("Orden de trabajo no encontrada", 404, "WORK_ORDER_NOT_FOUND");
    }
    return this.payments.listByWorkOrder(workOrderId);
  }

  async getFinancialSummary(workOrderId: string): Promise<OrderFinancialSummary> {
    const summary = await this.payments.getFinancialSummary(workOrderId);
    if (!summary) {
      throw new AppError("Orden de trabajo no encontrada", 404, "WORK_ORDER_NOT_FOUND");
    }
    return summary;
  }

  async listFinancialSummaries(search?: string): Promise<OrderFinancialSummary[]> {
    return this.payments.listFinancialSummaries(search);
  }

  async updateOrderTotal(
    workOrderId: string,
    totalAmount: number,
    actorId: string
  ): Promise<OrderFinancialSummary> {
    const order = await this.orders.findById(workOrderId);
    if (!order) {
      throw new AppError("Orden de trabajo no encontrada", 404, "WORK_ORDER_NOT_FOUND");
    }

    const currentTotalPaid = await this.payments.getTotalPaidForOrder(workOrderId);
    if (totalAmount < currentTotalPaid) {
      throw new AppError(
        `El monto total aprobado (Q ${totalAmount.toFixed(2)}) no puede ser menor al total ya pagado (Q ${currentTotalPaid.toFixed(2)})`,
        422,
        "TOTAL_LESS_THAN_PAID"
      );
    }

    const previousTotal = order.totalAmount;
    await this.orders.updateTotalAmount(workOrderId, totalAmount);

    await this.audit.record(actorId, "WORK_ORDER_TOTAL_UPDATED", "WORK_ORDER", workOrderId, {
      workOrderId,
      workOrderCode: order.code,
      previousTotal,
      newTotal: totalAmount
    });

    return this.getFinancialSummary(workOrderId);
  }

  async create(
    input: CreatePaymentDto,
    actorId: string
  ): Promise<{ payment: Payment; summary: OrderFinancialSummary }> {
    return this.payments.createPaymentWithLock(input, actorId, this.audit);
  }
}
