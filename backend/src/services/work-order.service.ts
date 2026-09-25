import type { CreateWorkOrderDto, UpdateWorkOrderDto } from "../dtos/admin.dtos";
import { ClientRepository } from "../repositories/client.repository";
import { UserRepository } from "../repositories/user.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";
import { OperationalRepository, OperatorNotificationRepository } from "../repositories/operational.repository";
import { AppError } from "../utils/app-error";
import { AuditService } from "./audit.service";
import { OrderTimelineService } from "./order-timeline.service";
export class WorkOrderService {
  private readonly orders = new WorkOrderRepository();
  private readonly clients = new ClientRepository();
  private readonly users = new UserRepository();
  private readonly audit = new AuditService();
  private readonly operational = new OperationalRepository();
  private readonly notifications = new OperatorNotificationRepository();
  private readonly timelineService = new OrderTimelineService();

  list(filters: { search?: string; status?: string; page: number; limit: number }) { return this.orders.list(filters); }

  async listByClient(clientId: string) {
    if (!await this.clients.findById(clientId)) throw new AppError("Cliente no encontrado", 404, "CLIENT_NOT_FOUND");
    return this.orders.listByClient(clientId);
  }

  async get(id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND");
    return order;
  }

  history(id: string) { return this.get(id).then(() => this.operational.eventsForOrder(id)); }
  timeline(id: string) { return this.get(id).then(() => this.timelineService.list(id)); }

  async create(input: CreateWorkOrderDto, actorId: string) {
    if (!await this.clients.findById(input.clientId)) throw new AppError("Cliente no encontrado", 422, "CLIENT_NOT_FOUND");
    const order = await this.orders.create({ ...input, status: "PENDING" }, actorId);
    await this.audit.record(actorId, "WORK_ORDER_CREATED", "WORK_ORDER", order.id, { code: order.code, clientId: input.clientId });
    return order;
  }

  async update(id: string, input: UpdateWorkOrderDto, actorId: string) {
    const order = await this.orders.update(id, input);
    if (!order) throw new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND");
    await this.audit.record(actorId, "WORK_ORDER_UPDATED", "WORK_ORDER", order.id, { code: order.code });
    return order;
  }

  async assignWorker(orderId: string, workerId: string, actorId: string) {
    const currentOrder = await this.get(orderId);
    if (currentOrder.status === "COMPLETED" || currentOrder.status === "CANCELLED") {
      throw new AppError("No se puede asignar personal a una orden finalizada o cancelada", 409, "WORK_ORDER_NOT_ASSIGNABLE");
    }
    if (currentOrder.assignedWorkerId === workerId) {
      throw new AppError("La orden ya está asignada a este trabajador", 409, "WORK_ORDER_ALREADY_ASSIGNED");
    }
    const worker = await this.users.findById(workerId);
    if (!worker || worker.role !== "OPERATOR" || !worker.isActive) {
      throw new AppError("El trabajador operativo no está disponible", 422, "WORKER_NOT_AVAILABLE");
    }
    const order = await this.orders.assignWorker(orderId, workerId);
    if (!order) throw new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND");
    await Promise.all([
      this.audit.record(actorId, "WORK_ORDER_ASSIGNED", "WORK_ORDER", order.id, { workerId, workerName: worker.fullName }),
      this.operational.recordAssignment(actorId, workerId, order.id, order.code),
      this.notifications.create(workerId, order.id, "ORDER_ASSIGNED", `Se te asignó la orden ${order.code}.`)
    ]);
    return order;
  }
}
