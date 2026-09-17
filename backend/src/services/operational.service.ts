import type { UpdateOperationalProgressDto } from "../dtos/admin.dtos";
import type { WorkOrder } from "../models/domain";
import { OperationalRepository, OperatorNotificationRepository } from "../repositories/operational.repository";
import { AppError } from "../utils/app-error";
import { AuditService } from "./audit.service";

export class OperationalService {
  private readonly repository = new OperationalRepository(); private readonly notifications = new OperatorNotificationRepository(); private readonly audit = new AuditService();
  dashboard(workerId: string) { return this.repository.dashboard(workerId); }
  listOrders(workerId: string, filters: { search?: string; status?: string; priority?: string; date?: string; page: number; limit: number }) { return this.repository.listOrders(workerId, filters); }
  async order(workerId: string, orderId: string) { const order = await this.repository.findOwnedOrder(workerId, orderId); if (order) return order; throw new AppError("No tienes acceso a esta orden", 403, "ORDER_NOT_OWNED"); }
  history(workerId: string, orderId: string) { return this.order(workerId, orderId).then(() => this.repository.events(workerId, orderId)); }
  activity(workerId: string) { return this.repository.events(workerId); }
  notificationsFor(workerId: string) { return this.notifications.list(workerId); }
  async markNotificationRead(workerId: string, id: string) { if (!await this.notifications.markRead(workerId, id)) throw new AppError("Notificación no encontrada", 404, "NOTIFICATION_NOT_FOUND"); }
  async start(workerId: string, orderId: string) { const order = await this.runChange(() => this.repository.start(workerId, orderId)); await this.audit.record(workerId, "WORK_STARTED", "WORK_ORDER", orderId, { code: order.code }); return order; }
  async updateProgress(workerId: string, orderId: string, input: UpdateOperationalProgressDto) { const order = await this.runChange(() => this.repository.progress(workerId, orderId, input.progress, input.observation)); await this.audit.record(workerId, "WORK_PROGRESS_UPDATED", "WORK_ORDER", orderId, { code: order.code, progress: input.progress }); return order; }
  async complete(workerId: string, orderId: string, observation: string) { const order = await this.runChange(() => this.repository.complete(workerId, orderId, observation)); await this.audit.record(workerId, "WORK_COMPLETED", "WORK_ORDER", orderId, { code: order.code }); return order; }
  private async runChange(operation: () => Promise<WorkOrder | null>) { try { const order = await operation(); if (!order) throw new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND"); return order; } catch (error) { if (error instanceof AppError) throw error; const code = (error as Error).message; const messages: Record<string, [string, number, string]> = { ORDER_NOT_FOUND: ["Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND"], ORDER_NOT_OWNED: ["No tienes acceso a esta orden", 403, "ORDER_NOT_OWNED"], ORDER_CANNOT_START: ["La orden no se puede iniciar en su estado actual", 409, "ORDER_CANNOT_START"], ORDER_NOT_IN_PROGRESS: ["Solo puedes actualizar órdenes en proceso", 409, "ORDER_NOT_IN_PROGRESS"], ORDER_CANNOT_COMPLETE: ["La orden no se puede finalizar en su estado actual", 409, "ORDER_CANNOT_COMPLETE"], PROGRESS_DECREASE: ["El avance no puede disminuir", 422, "PROGRESS_DECREASE"] }; const mapped = messages[code]; if (mapped) throw new AppError(mapped[0], mapped[1], mapped[2]); throw error; } }
}
