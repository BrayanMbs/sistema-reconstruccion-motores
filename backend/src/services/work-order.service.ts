import type { CreateWorkOrderDto } from "../dtos/admin.dtos";
import { ClientRepository } from "../repositories/client.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";
import { AppError } from "../utils/app-error";
import { AuditService } from "./audit.service";
export class WorkOrderService { private readonly orders = new WorkOrderRepository(); private readonly clients = new ClientRepository(); private readonly audit = new AuditService(); list(filters: { search?: string; status?: string; page: number; limit: number }) { return this.orders.list(filters); } async get(id: string) { const order = await this.orders.findById(id); if (!order) throw new AppError("Orden no encontrada", 404, "WORK_ORDER_NOT_FOUND"); return order; } async create(input: CreateWorkOrderDto, actorId: string) { if (!await this.clients.findById(input.clientId)) throw new AppError("Cliente no encontrado", 422, "CLIENT_NOT_FOUND"); const order = await this.orders.create(input, actorId); await this.audit.record(actorId, "WORK_ORDER_CREATED", "WORK_ORDER", order.id, { code: order.code, clientId: input.clientId }); return order; } }
