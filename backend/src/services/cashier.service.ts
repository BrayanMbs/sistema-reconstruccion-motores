import type { CreatePaymentDto } from "../dtos/finance.dtos";
import type { CashierOrderFilters, CashierPaymentFilters } from "../dtos/cashier.dtos";
import { CashierRepository } from "../repositories/cashier.repository";
import { PaymentService } from "./payment.service";
export class CashierService { private readonly cashier=new CashierRepository(); private readonly payments=new PaymentService(); dashboard(actorId:string){return this.cashier.dashboard(actorId);} orders(filters:CashierOrderFilters){return this.cashier.orders(filters);} paymentsHistory(filters:CashierPaymentFilters){return this.cashier.payments(filters);} async payment(id:string){const payment=await this.cashier.payment(id);if(!payment) throw new (await import("../utils/app-error")).AppError("Pago no encontrado",404,"PAYMENT_NOT_FOUND");return payment;} recordPayment(input:CreatePaymentDto,actorId:string){return this.payments.create(input,actorId);} summary(actorId:string){return this.cashier.daily(actorId);} }
