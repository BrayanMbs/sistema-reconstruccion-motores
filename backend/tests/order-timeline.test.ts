import { describe, expect, it, vi } from "vitest";

const sources = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../src/repositories/order-timeline.repository", () => ({
  OrderTimelineRepository: class { list = sources.list; }
}));

import { OrderTimelineService } from "../src/services/order-timeline.service";

const at = (minute: number) => `2026-09-25T08:${String(minute).padStart(2, "0")}:00.000Z`;

describe("OrderTimelineService", () => {
  it("normalizes only evidence-backed events in ascending deterministic order", async () => {
    sources.list.mockResolvedValue([
      { id: "event-completed", source: "OPERATIONAL", eventType: "WORK_COMPLETED", occurredAt: at(40), actorId: "operator-1", actorName: "Carlos", subjectName: null, message: "Trabajo finalizado", progress: 100 },
      { id: "inventory-exit", source: "INVENTORY", eventType: "EXIT", occurredAt: at(20), actorId: "admin-1", actorName: "Ana", subjectName: null, message: null, progress: null },
      { id: "event-progress", source: "OPERATIONAL", eventType: "PROGRESS_UPDATED", occurredAt: at(30), actorId: "operator-1", actorName: "Carlos", subjectName: null, message: "Cilindros revisados", progress: 60 },
      { id: "event-assigned", source: "OPERATIONAL", eventType: "ORDER_ASSIGNED", occurredAt: at(10), actorId: "admin-1", actorName: "Ana", subjectName: "Carlos", message: "Nueva orden asignada", progress: null },
      { id: "order-1", source: "ORDER", eventType: "ORDER_CREATED", occurredAt: at(0), actorId: "admin-1", actorName: "Ana", subjectName: null, message: null, progress: null }
    ]);

    const items = await new OrderTimelineService().list("order-1");

    expect(items.map((item) => item.type)).toEqual(["ORDER_CREATED", "ORDER_ASSIGNED", "INVENTORY_CONSUMED", "PROGRESS_UPDATED", "WORK_COMPLETED"]);
    expect(items.filter((item) => item.type === "ORDER_CREATED")).toHaveLength(1);
    expect(items[1]).toMatchObject({ title: "Orden asignada", description: "Asignada a Carlos.", actor: { id: "admin-1", name: "Ana" } });
    expect(items[2].description).toBe("Se registró salida de inventario para esta orden.");
    expect(items[3]).toMatchObject({ progress: 60, description: "Cilindros revisados" });
    expect(JSON.stringify(items)).not.toContain("referenceUnitCost");
  });

  it("marks subsequent recorded assignments as reassignments", async () => {
    sources.list.mockResolvedValue([
      { id: "assignment-2", source: "OPERATIONAL", eventType: "ORDER_ASSIGNED", occurredAt: at(20), actorId: "admin-2", actorName: "Bea", subjectName: "Diego", message: null, progress: null },
      { id: "assignment-1", source: "OPERATIONAL", eventType: "ORDER_ASSIGNED", occurredAt: at(10), actorId: "admin-1", actorName: "Ana", subjectName: "Carlos", message: null, progress: null }
    ]);
    await expect(new OrderTimelineService().list("order-1")).resolves.toMatchObject([{ type: "ORDER_ASSIGNED" }, { type: "ORDER_REASSIGNED", description: "Reasignada a Diego." }]);
  });
});
