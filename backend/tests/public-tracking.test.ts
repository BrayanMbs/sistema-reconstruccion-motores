import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("../src/repositories/public-tracking.repository", () => ({
  PublicTrackingRepository: class { find = mocks.find; }
}));

import { app } from "../src/app";

const validQuery = { orderNumber: "OT-2026-00001", trackingCode: "MTR-ABCDEF0123456789ABCDEF01" };

describe("POST /api/public/orders/tracking", () => {
  it("is accessible without a session and returns only the public DTO", async () => {
    mocks.find.mockResolvedValueOnce({ orderNumber: validQuery.orderNumber, status: "IN_PROGRESS", progress: 45, serviceDescription: "Pruebas técnicas en curso.", serviceType: "Reconstrucción", engineSummary: "Cummins ISX", receivedAt: "2026-09-01T12:00:00.000Z", estimatedDate: "2026-09-18", lastUpdatedAt: "2026-09-05T12:00:00.000Z", timeline: [{ type: "ORDER_RECEIVED", title: "Orden recibida", message: "El motor fue recibido y la orden quedó registrada.", progress: 0, occurredAt: "2026-09-01T12:00:00.000Z" }] });
    const response = await request(app).post("/api/public/orders/tracking").send(validQuery);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ tracking: expect.objectContaining({ orderNumber: "OT-2026-00001", progress: 45, engineSummary: "Cummins ISX" }) });
    expect(response.body.tracking).not.toHaveProperty("clientName");
    expect(response.body.tracking).not.toHaveProperty("intakeNotes");
    expect(response.body.tracking).not.toHaveProperty("trackingCode");
    expect(response.body.tracking.timeline[0]).toEqual(expect.objectContaining({ title: "Orden recibida", progress: 0 }));
  });

  it("returns the same generic response for a non-existent order or wrong code", async () => {
    mocks.find.mockResolvedValue(null);
    const missingOrder = await request(app).post("/api/public/orders/tracking").send(validQuery);
    mocks.find.mockResolvedValue(null);
    const wrongCode = await request(app).post("/api/public/orders/tracking").send({ ...validQuery, trackingCode: "MTR-111111111111111111111111" });
    expect(missingOrder.status).toBe(404);
    expect(wrongCode.status).toBe(404);
    expect(missingOrder.body).toEqual(wrongCode.body);
    expect(missingOrder.body.message).toBe("No se pudo encontrar una orden con los datos proporcionados.");
  });

  it("validates missing or malformed values before querying persistence", async () => {
    const missing = await request(app).post("/api/public/orders/tracking").send({ orderNumber: "" });
    const malformed = await request(app).post("/api/public/orders/tracking").send({ orderNumber: "OT-1", trackingCode: "inseguro" });
    expect(missing.status).toBe(422);
    expect(malformed.status).toBe(422);
    expect(malformed.body.message).toBe("No se pudo encontrar una orden con los datos proporcionados.");
  });
});
