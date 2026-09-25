import type { OrderTimelineEvent, OrderTimelineEventType } from "../models/domain";
import { OrderTimelineRepository, type TimelineSourceEvent } from "../repositories/order-timeline.repository";

const priority: Record<OrderTimelineEventType, number> = { ORDER_CREATED: 0, ORDER_ASSIGNED: 1, ORDER_REASSIGNED: 1, WORK_STARTED: 2, INVENTORY_CONSUMED: 3, INVENTORY_RETURNED: 3, PROGRESS_UPDATED: 4, WORK_COMPLETED: 5 };
const actorOf = (event: TimelineSourceEvent) => event.actorId && event.actorName ? { id: event.actorId, name: event.actorName } : null;

export class OrderTimelineService {
  private readonly repository = new OrderTimelineRepository();

  async list(orderId: string): Promise<OrderTimelineEvent[]> {
    // Domain rows are preferred over audit rows: audit mirrors several of these actions
    // and does not preserve enough business detail for a safe, duplicate-free timeline.
    const sources = await this.repository.list(orderId);
    const ordered = [...sources].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime() || left.id.localeCompare(right.id));
    let assignmentCount = 0;
    const events = ordered.flatMap((event) => this.normalize(event, event.eventType === "ORDER_ASSIGNED" ? assignmentCount++ : assignmentCount));
    return events.sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime() || priority[left.type] - priority[right.type] || left.id.localeCompare(right.id));
  }

  private normalize(event: TimelineSourceEvent, assignmentIndex: number): OrderTimelineEvent[] {
    const base = { id: event.id, occurredAt: event.occurredAt, actor: actorOf(event), progress: event.progress };
    if (event.source === "ORDER") return [{ ...base, type: "ORDER_CREATED", title: "Orden creada", description: "La orden fue registrada." }];
    if (event.source === "INVENTORY") return [{ ...base, type: event.eventType === "EXIT" ? "INVENTORY_CONSUMED" : "INVENTORY_RETURNED", title: event.eventType === "EXIT" ? "Material utilizado" : "Material devuelto", description: event.eventType === "EXIT" ? "Se registró salida de inventario para esta orden." : "Se registró devolución de material para esta orden." }];
    if (event.eventType === "ORDER_ASSIGNED") { const reassigned = assignmentIndex > 0; return [{ ...base, type: reassigned ? "ORDER_REASSIGNED" : "ORDER_ASSIGNED", title: reassigned ? "Orden reasignada" : "Orden asignada", description: event.subjectName ? `${reassigned ? "Reasignada" : "Asignada"} a ${event.subjectName}.` : null }]; }
    if (event.eventType === "WORK_STARTED") return [{ ...base, type: "WORK_STARTED", title: "Trabajo iniciado", description: event.message }];
    if (event.eventType === "PROGRESS_UPDATED") return [{ ...base, type: "PROGRESS_UPDATED", title: "Avance actualizado", description: event.message }];
    if (event.eventType === "WORK_COMPLETED") return [{ ...base, type: "WORK_COMPLETED", title: "Orden finalizada", description: event.message }];
    return [];
  }
}
