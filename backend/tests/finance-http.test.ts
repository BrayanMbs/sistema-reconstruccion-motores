import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AppUser, Role } from "../src/models/domain";

const profile = (role: Role): AppUser => ({
  id: `${role.toLowerCase()}-id`,
  fullName: role,
  email: `${role.toLowerCase()}@example.com`,
  role,
  isActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01"
});

vi.mock("../src/services/auth.service", () => ({
  AuthService: class {
    authenticateToken(token: string) {
      const roles: Record<string, Role> = {
        admin: "ADMIN",
        administrative: "ADMINISTRATIVE",
        operator: "OPERATOR",
        cashier: "CASHIER"
      };
      const role = roles[token];
      if (!role) throw new Error("INVALID_TEST_TOKEN");
      return Promise.resolve(profile(role));
    }
  }
}));

const mockSummary = {
  workOrderId: "order-1",
  workOrderCode: "OT-2026-00001",
  clientName: "Mario Molina",
  totalAmount: 3500,
  totalPaid: 1000,
  balance: 2500,
  financialStatus: "PARTIAL" as const
};

vi.mock("../src/services/payment.service", () => ({
  PaymentService: class {
    list() {
      return Promise.resolve([]);
    }
    listByWorkOrder() {
      return Promise.resolve([]);
    }
    getFinancialSummary() {
      return Promise.resolve(mockSummary);
    }
    listFinancialSummaries() {
      return Promise.resolve([mockSummary]);
    }
    updateOrderTotal() {
      return Promise.resolve(mockSummary);
    }
    create() {
      return Promise.resolve({
        payment: {
          id: "pay-1",
          workOrderId: "order-1",
          workOrderCode: "OT-2026-00001",
          clientName: "Mario Molina",
          amount: 500,
          method: "Efectivo",
          reference: null,
          notes: null,
          receivedBy: "Admin",
          createdAt: "2026-01-01T00:00:00.000Z"
        },
        summary: mockSummary
      });
    }
  }
}));

vi.mock("../src/repositories/public-tracking.repository", () => ({
  PublicTrackingRepository: class {
    find() {
      return Promise.resolve({
        orderNumber: "OT-2026-00001",
        status: "IN_PROGRESS",
        progress: 40,
        serviceDescription: "Reparación de bloque",
        serviceType: "Reconstrucción",
        engineSummary: "Toyota 1HZ",
        receivedAt: "2026-01-01T00:00:00.000Z",
        estimatedDate: "2026-01-10",
        lastUpdatedAt: "2026-01-02T00:00:00.000Z",
        timeline: []
      });
    }
  }
}));

import { app } from "../src/app";

describe("Finance HTTP security & endpoints", () => {
  it("rejects unauthenticated requests to finance routes with 401", async () => {
    const resGetFinance = await request(app).get("/api/admin/work-orders/order-1/finance");
    expect(resGetFinance.status).toBe(401);

    const resPatchFinance = await request(app).patch("/api/admin/work-orders/order-1/finance").send({ totalAmount: 1000 });
    expect(resPatchFinance.status).toBe(401);

    const resGetPayments = await request(app).get("/api/admin/work-orders/order-1/payments");
    expect(resGetPayments.status).toBe(401);

    const resPostPayment = await request(app).post("/api/admin/payments").send({ workOrderId: "order-1", amount: 100, method: "Efectivo" });
    expect(resPostPayment.status).toBe(401);
  });

  it("rejects non-admin roles (operator, administrative) with 403", async () => {
    const resOp = await request(app)
      .get("/api/admin/work-orders/order-1/finance")
      .set("Authorization", "Bearer operator");
    expect(resOp.status).toBe(403);

    const resAdmin = await request(app)
      .get("/api/admin/work-orders/order-1/finance")
      .set("Authorization", "Bearer administrative");
    expect(resAdmin.status).toBe(403);
  });

  it("allows ADMIN to access finance endpoints", async () => {
    const resGetFinance = await request(app)
      .get("/api/admin/work-orders/order-1/finance")
      .set("Authorization", "Bearer admin");
    expect(resGetFinance.status).toBe(200);
    expect(resGetFinance.body.summary).toEqual(mockSummary);

    const resPatchFinance = await request(app)
      .patch("/api/admin/work-orders/order-1/finance")
      .set("Authorization", "Bearer admin")
      .send({ totalAmount: 4000 });
    expect(resPatchFinance.status).toBe(200);

    const resGetPayments = await request(app)
      .get("/api/admin/work-orders/order-1/payments")
      .set("Authorization", "Bearer admin");
    expect(resGetPayments.status).toBe(200);

    const resPostPayment = await request(app)
      .post("/api/admin/payments")
      .set("Authorization", "Bearer admin")
      .send({ workOrderId: "order-1", amount: 500, method: "Efectivo" });
    expect(resPostPayment.status).toBe(201);
    expect(resPostPayment.body.payment).toBeDefined();
    expect(resPostPayment.body.summary).toBeDefined();
  });

  it("verifies public tracking endpoint does NOT expose any financial fields", async () => {
    const res = await request(app)
      .post("/api/public/orders/tracking")
      .send({ orderNumber: "OT-2026-00001", trackingCode: "MTR-ABCDEF0123456789ABCDEF01" });
    expect(res.status).toBe(200);
    expect(res.body.tracking).toBeDefined();
    const trackingData = res.body.tracking;

    expect(trackingData.totalAmount).toBeUndefined();
    expect(trackingData.total_amount).toBeUndefined();
    expect(trackingData.totalPaid).toBeUndefined();
    expect(trackingData.total_paid).toBeUndefined();
    expect(trackingData.balance).toBeUndefined();
    expect(trackingData.financialStatus).toBeUndefined();
    expect(trackingData.financial_status).toBeUndefined();
    expect(trackingData.payments).toBeUndefined();
  });
});
