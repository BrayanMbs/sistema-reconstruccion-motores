import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findOwnedOrder: vi.fn(), progress: vi.fn(), start: vi.fn(), complete: vi.fn(), events: vi.fn(), listOrders: vi.fn(), dashboard: vi.fn(), markRead: vi.fn(), notifications: vi.fn(), auditRecord: vi.fn() }));
vi.mock("../src/repositories/operational.repository", () => ({
  OperationalRepository: class { findOwnedOrder = mocks.findOwnedOrder; progress = mocks.progress; start = mocks.start; complete = mocks.complete; events = mocks.events; listOrders = mocks.listOrders; dashboard = mocks.dashboard; },
  OperatorNotificationRepository: class { markRead = mocks.markRead; list = mocks.notifications; }
}));
vi.mock("../src/services/audit.service", () => ({ AuditService: class { record = mocks.auditRecord; } }));

import { OperationalService } from "../src/services/operational.service";

describe("OperationalService", () => {
  it("does not expose an order that is not owned by the worker", async () => {
    mocks.findOwnedOrder.mockResolvedValue(null);
    await expect(new OperationalService().order("worker-a", "order-b")).rejects.toMatchObject({ statusCode: 403, code: "ORDER_NOT_OWNED" });
  });
  it("rejects a progress decrease reported by the repository", async () => {
    mocks.progress.mockRejectedValue(new Error("PROGRESS_DECREASE"));
    await expect(new OperationalService().updateProgress("worker-a", "order-a", { progress: 20, observation: "Corrección" })).rejects.toMatchObject({ statusCode: 422, code: "PROGRESS_DECREASE" });
  });
  it("only marks a notification belonging to the current worker", async () => {
    mocks.markRead.mockResolvedValue(false);
    await expect(new OperationalService().markNotificationRead("worker-a", "notification-b")).rejects.toMatchObject({ statusCode: 404, code: "NOTIFICATION_NOT_FOUND" });
  });
});
