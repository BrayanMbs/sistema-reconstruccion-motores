import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ clientFind: vi.fn(), clientCreate: vi.fn(), clientUpdate: vi.fn(), clientOrders: vi.fn(), orderFind: vi.fn(), orderCreate: vi.fn(), orderUpdate: vi.fn(), orderAssign: vi.fn(), userFind: vi.fn(), audit: vi.fn(), assignment: vi.fn(), notify: vi.fn() }));
vi.mock("../src/repositories/client.repository", () => ({ ClientRepository: class { findById = mocks.clientFind; create = mocks.clientCreate; update = mocks.clientUpdate; } }));
vi.mock("../src/repositories/work-order.repository", () => ({ WorkOrderRepository: class { findById = mocks.orderFind; create = mocks.orderCreate; update = mocks.orderUpdate; assignWorker = mocks.orderAssign; listByClient = mocks.clientOrders; } }));
vi.mock("../src/repositories/user.repository", () => ({ UserRepository: class { findById = mocks.userFind; } }));
vi.mock("../src/repositories/operational.repository", () => ({ OperationalRepository: class { recordAssignment = mocks.assignment; }, OperatorNotificationRepository: class { create = mocks.notify; } }));
vi.mock("../src/services/audit.service", () => ({ AuditService: class { record = mocks.audit; } }));

import { ClientService } from "../src/services/client.service";
import { WorkOrderService } from "../src/services/work-order.service";

const clientInput = { fullName: "Cliente", identificationType: "DPI" as const, identification: "123", phone: null, email: null, address: null };
const client = { id: "client-id", ...clientInput, createdAt: "2026-01-01" };
const orderInput = { clientId: "client-id", engineBrand: "Cummins", engineModel: "X15", serviceType: "Reconstrucción", description: "Servicio", priority: "HIGH" as const };
const order = { id: "order-id", code: "OT-1", ...orderInput, status: "PENDING", progress: 0, assignedWorkerId: null };

describe("administrative services", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates a client and records its audit event", async () => { mocks.clientCreate.mockResolvedValue(client); await expect(new ClientService().create(clientInput, "actor")).resolves.toEqual(client); expect(mocks.audit).toHaveBeenCalledWith("actor", "CLIENT_CREATED", "CLIENT", "client-id", expect.any(Object)); });
  it("updates a client and records its audit event", async () => { mocks.clientUpdate.mockResolvedValue(client); await expect(new ClientService().update("client-id", clientInput, "actor")).resolves.toEqual(client); expect(mocks.audit).toHaveBeenCalledWith("actor", "CLIENT_UPDATED", "CLIENT", "client-id", expect.any(Object)); });
  it("creates every administrative order as PENDING", async () => { mocks.clientFind.mockResolvedValue(client); mocks.orderCreate.mockResolvedValue(order); await new WorkOrderService().create(orderInput, "actor"); expect(mocks.orderCreate).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING" }), "actor"); });
  it("assigns an active OPERATOR and preserves side effects", async () => { mocks.orderFind.mockResolvedValue(order); mocks.userFind.mockResolvedValue({ id: "worker", fullName: "Técnico", role: "OPERATOR", isActive: true }); mocks.orderAssign.mockResolvedValue({ ...order, assignedWorkerId: "worker" }); await new WorkOrderService().assignWorker("order-id", "worker", "actor"); expect(mocks.assignment).toHaveBeenCalled(); expect(mocks.notify).toHaveBeenCalled(); expect(mocks.audit).toHaveBeenCalledWith("actor", "WORK_ORDER_ASSIGNED", "WORK_ORDER", "order-id", expect.any(Object)); });
  it.each([{ role: "ADMIN", isActive: true }, { role: "OPERATOR", isActive: false }, null])("rejects an unavailable worker: %s", async (worker) => { mocks.orderFind.mockResolvedValue(order); mocks.userFind.mockResolvedValue(worker); await expect(new WorkOrderService().assignWorker("order-id", "worker", "actor")).rejects.toMatchObject({ statusCode: 422, code: "WORKER_NOT_AVAILABLE" }); expect(mocks.orderAssign).not.toHaveBeenCalled(); });
  it("rejects assigning the current operator without side effects", async () => { mocks.orderFind.mockResolvedValue({ ...order, assignedWorkerId: "worker" }); await expect(new WorkOrderService().assignWorker("order-id", "worker", "actor")).rejects.toMatchObject({ statusCode: 409, code: "WORK_ORDER_ALREADY_ASSIGNED" }); expect(mocks.orderAssign).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled(); expect(mocks.assignment).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled(); });
  it.each(["COMPLETED", "CANCELLED"])("rejects assigning a %s order", async (status) => { mocks.orderFind.mockResolvedValue({ ...order, status }); await expect(new WorkOrderService().assignWorker("order-id", "worker", "actor")).rejects.toMatchObject({ statusCode: 409, code: "WORK_ORDER_NOT_ASSIGNABLE" }); expect(mocks.orderAssign).not.toHaveBeenCalled(); });
  it("returns 404 for related orders when the client does not exist", async () => { mocks.clientFind.mockResolvedValue(null); await expect(new WorkOrderService().listByClient("missing")).rejects.toMatchObject({ statusCode: 404, code: "CLIENT_NOT_FOUND" }); expect(mocks.clientOrders).not.toHaveBeenCalled(); });
  it("returns an empty related-order list for an existing client", async () => { mocks.clientFind.mockResolvedValue(client); mocks.clientOrders.mockResolvedValue([]); await expect(new WorkOrderService().listByClient("client-id")).resolves.toEqual([]); });
});
