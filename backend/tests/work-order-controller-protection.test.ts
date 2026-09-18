import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("../src/services/work-order.service", () => ({ WorkOrderService: class { create = mocks.create; update = mocks.update; } }));

import { createWorkOrder, updateWorkOrder } from "../src/controllers/work-order.controller";

const body = {
  clientId: "client-id",
  engineBrand: "Cummins",
  engineModel: "X15",
  engineSerial: "SERIE",
  serviceType: "Reconstrucción",
  description: "Descripción",
  estimatedDate: "2026-12-15",
  intakeNotes: "Ingreso",
  publicNote: "Seguimiento",
  priority: "HIGH",
  status: "COMPLETED",
  progress: 100,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-02T00:00:00Z",
  assignedWorkerId: "malicious-worker"
};

const response = () => {
  const value = { status: vi.fn(), json: vi.fn() };
  value.status.mockReturnValue(value);
  return value as unknown as Response;
};

describe("work-order controller operational-field protection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("strips operational fields from an administrative update", async () => {
    const unchangedOperationalState = { id: "order-id", engineBrand: "Cummins", status: "PENDING", progress: 0, startedAt: null, completedAt: null };
    mocks.update.mockResolvedValue(unchangedOperationalState);
    const target = response();
    await updateWorkOrder({ body, params: { id: "order-id" }, appUser: { id: "actor" } } as unknown as Request, target);
    const input = mocks.update.mock.calls[0][1];
    expect(input).toMatchObject({ engineBrand: "Cummins", priority: "HIGH" });
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("progress");
    expect(input).not.toHaveProperty("startedAt");
    expect(input).not.toHaveProperty("completedAt");
    expect(input).not.toHaveProperty("assignedWorkerId");
    expect(target.json).toHaveBeenCalledWith({ order: unchangedOperationalState });
  });

  it("forces creation through the service without client-supplied progress", async () => {
    mocks.create.mockResolvedValue({ id: "order-id", status: "PENDING", progress: 0 });
    await createWorkOrder({ body, appUser: { id: "actor" } } as unknown as Request, response());
    const input = mocks.create.mock.calls[0][0];
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("progress");
  });

  it.each(["2026-99-99", "hola", "2026-02-30"])("rejects invalid estimated date %s", async (estimatedDate) => {
    await expect(createWorkOrder({ body: { ...body, estimatedDate }, appUser: { id: "actor" } } as unknown as Request, response())).rejects.toMatchObject({ statusCode: 422, code: "VALIDATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
