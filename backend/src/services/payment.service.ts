import type { CreatePaymentDto } from "../dtos/admin.dtos";
import { PaymentRepository } from "../repositories/payment.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";
import { AppError } from "../utils/app-error";
import { AuditService } from "./audit.service";
export class PaymentService { private readonly payments = new PaymentRepository(); private readonly orders = new WorkOrderRepository(); private readonly audit = new AuditService(); list() { return this.payments.list(); } async create(input: CreatePaymentDto, actorId: string) { if (!await this.orders.findById(input.workOrderId)) throw new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND"); const payment = await this.payments.create(input, actorId); await this.audit.record(actorId, "PAYMENT_RECORDED", "PAYMENT", payment.id, { workOrderId: input.workOrderId, amount: input.amount }); return payment; } }
