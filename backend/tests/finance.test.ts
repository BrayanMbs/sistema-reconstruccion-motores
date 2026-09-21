import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  clientQuery: vi.fn(),
  clientRelease: vi.fn(),
  orderFind: vi.fn(),
  orderUpdateTotal: vi.fn(),
  auditRecord: vi.fn()
}));

vi.mock("../src/config/database", () => ({
  databasePool: {
    query: mocks.poolQuery,
    connect: mocks.poolConnect
  }
}));

vi.mock("../src/repositories/work-order.repository", () => ({
  WorkOrderRepository: class {
    findById = mocks.orderFind;
    updateTotalAmount = mocks.orderUpdateTotal;
  }
}));

vi.mock("../src/services/audit.service", () => ({
  AuditService: class {
    record = mocks.auditRecord;
  }
}));

import { PaymentService } from "../src/services/payment.service";
import { validateMoneyAmount, validatePaymentInput, validateUpdateOrderFinance } from "../src/validators/finance.validators";
import { computeFinancialStatus } from "../src/repositories/payment.repository";

const mockOrder = {
  id: "order-1",
  code: "OT-2026-00001",
  trackingCode: "MTR-12345",
  clientId: "client-1",
  clientName: "Mario Molina",
  engineBrand: "Toyota",
  engineModel: "1HZ",
  engineSerial: null,
  serviceType: "Reconstrucción",
  description: "Reparación general",
  status: "PENDING" as const,
  progress: 0,
  assignedWorkerId: null,
  assignedWorker: null,
  estimatedDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  intakeNotes: null,
  publicNote: null,
  priority: "NORMAL" as const,
  startedAt: null,
  completedAt: null,
  totalAmount: 3500
};

describe("Finance validators", () => {
  describe("validateMoneyAmount", () => {
    it("accepts valid positive numbers with up to 2 decimal places", () => {
      expect(validateMoneyAmount(3500, "Monto")).toBe(3500);
      expect(validateMoneyAmount(12.5, "Monto")).toBe(12.5);
      expect(validateMoneyAmount("500.25", "Monto")).toBe(500.25);
    });

    it("allows zero when option allowZero is true", () => {
      expect(validateMoneyAmount(0, "Monto", { allowZero: true })).toBe(0);
      expect(validateMoneyAmount("0.00", "Monto", { allowZero: true })).toBe(0);
    });

    it("rejects zero when allowZero is false", () => {
      expect(() => validateMoneyAmount(0, "Monto")).toThrowError(/mayor que cero/);
      expect(() => validateMoneyAmount("0", "Monto")).toThrowError(/mayor que cero/);
    });

    it("rejects negative numbers", () => {
      expect(() => validateMoneyAmount(-10, "Monto")).toThrowError(/mayor que cero/);
      expect(() => validateMoneyAmount(-5, "Monto", { allowZero: true })).toThrowError(/mayor o igual a cero/);
    });

    it("rejects values with more than 2 decimal places", () => {
      expect(() => validateMoneyAmount(10.555, "Monto")).toThrowError(/más de 2 decimales/);
      expect(() => validateMoneyAmount("10.555", "Monto")).toThrowError(/máximo de 2 decimales/);
    });

    it("rejects NaN, Infinity and non-numeric text", () => {
      expect(() => validateMoneyAmount(NaN, "Monto")).toThrowError(/número válido/);
      expect(() => validateMoneyAmount(Infinity, "Monto")).toThrowError(/número válido/);
      expect(() => validateMoneyAmount("abc", "Monto")).toThrowError(/formato numérico válido/);
      expect(() => validateMoneyAmount(null, "Monto")).toThrowError(/obligatorio/);
      expect(() => validateMoneyAmount("", "Monto")).toThrowError(/obligatorio/);
    });
  });

  describe("validatePaymentInput", () => {
    it("validates valid payment with cash method", () => {
      const input = validatePaymentInput({
        workOrderId: "order-1",
        amount: 500,
        method: "Efectivo",
        notes: "Anticipo"
      });
      expect(input.amount).toBe(500);
      expect(input.method).toBe("Efectivo");
      expect(input.reference).toBeNull();
    });

    it("requires reference when method is Transferencia", () => {
      expect(() => validatePaymentInput({
        workOrderId: "order-1",
        amount: 500,
        method: "Transferencia",
        reference: ""
      })).toThrowError(/referencia bancaria es obligatoria/);

      expect(() => validatePaymentInput({
        workOrderId: "order-1",
        amount: 500,
        method: "Transferencia"
      })).toThrowError(/referencia bancaria es obligatoria/);
    });

    it("accepts Transferencia with valid reference", () => {
      const input = validatePaymentInput({
        workOrderId: "order-1",
        amount: 500,
        method: "Transferencia",
        reference: "TRANS-98765"
      });
      expect(input.reference).toBe("TRANS-98765");
    });
  });

  describe("validateUpdateOrderFinance", () => {
    it("validates valid total amount", () => {
      const result = validateUpdateOrderFinance({ totalAmount: 4500.50 });
      expect(result.totalAmount).toBe(4500.5);
    });

    it("allows setting total to 0", () => {
      const result = validateUpdateOrderFinance({ totalAmount: 0 });
      expect(result.totalAmount).toBe(0);
    });

    it("rejects negative total amount", () => {
      expect(() => validateUpdateOrderFinance({ totalAmount: -100 })).toThrowError(/mayor o igual a cero/);
    });
  });
});

describe("computeFinancialStatus", () => {
  it("returns PENDING when totalAmount is null", () => {
    expect(computeFinancialStatus(null, 0, null)).toBe("PENDING");
  });

  it("returns PENDING when totalPaid is 0", () => {
    expect(computeFinancialStatus(3500, 0, 3500)).toBe("PENDING");
  });

  it("returns PARTIAL when totalPaid > 0 and balance > 0", () => {
    expect(computeFinancialStatus(3500, 1000, 2500)).toBe("PARTIAL");
  });

  it("returns PAID when balance is 0", () => {
    expect(computeFinancialStatus(3500, 3500, 0)).toBe("PAID");
  });
});

describe("PaymentService business logic", () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService();
    mocks.poolConnect.mockResolvedValue({
      query: mocks.clientQuery,
      release: mocks.clientRelease
    });
  });

  describe("updateOrderTotal", () => {
    it("defines valid approved total and records audit event", async () => {
      mocks.orderFind.mockResolvedValue(mockOrder);
      mocks.poolQuery.mockImplementation((sql: string) => {
        if (sql.includes("COALESCE(SUM(amount)")) {
          return Promise.resolve({ rows: [{ total_paid: "500.00" }] });
        }
        if (sql.includes("FROM work_orders o")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{
              work_order_id: "order-1",
              work_order_code: "OT-2026-00001",
              client_name: "Mario Molina",
              total_amount: "4000.00",
              total_paid: "500.00"
            }]
          });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      const summary = await service.updateOrderTotal("order-1", 4000, "user-admin");
      expect(mocks.orderUpdateTotal).toHaveBeenCalledWith("order-1", 4000);
      expect(mocks.auditRecord).toHaveBeenCalledWith(
        "user-admin",
        "WORK_ORDER_TOTAL_UPDATED",
        "WORK_ORDER",
        "order-1",
        expect.objectContaining({
          previousTotal: 3500,
          newTotal: 4000
        })
      );
      expect(summary.totalAmount).toBe(4000);
      expect(summary.balance).toBe(3500);
      expect(summary.financialStatus).toBe("PARTIAL");
    });

    it("rejects setting total lower than already paid amount", async () => {
      mocks.orderFind.mockResolvedValue(mockOrder);
      mocks.poolQuery.mockResolvedValueOnce({
        rows: [{ total_paid: "1500.00" }]
      });

      await expect(service.updateOrderTotal("order-1", 1000, "user-admin")).rejects.toMatchObject({
        statusCode: 422,
        code: "TOTAL_LESS_THAN_PAID"
      });
      expect(mocks.orderUpdateTotal).not.toHaveBeenCalled();
    });

    it("rejects updating total for non-existent order", async () => {
      mocks.orderFind.mockResolvedValue(null);

      await expect(service.updateOrderTotal("missing", 2000, "user-admin")).rejects.toMatchObject({
        statusCode: 404,
        code: "WORK_ORDER_NOT_FOUND"
      });
    });
  });

  describe("createPayment with concurrency locking", () => {
    it("records first partial payment correctly inside transaction", async () => {
      mocks.clientQuery.mockImplementation((sql: string) => {
        if (sql === "BEGIN" || sql === "COMMIT") return Promise.resolve();
        if (sql.includes("FOR UPDATE")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: "order-1", code: "OT-2026-00001", total_amount: "3500.00", client_name: "Mario Molina" }]
          });
        }
        if (sql.includes("SELECT COALESCE(SUM(amount)")) {
          return Promise.resolve({ rows: [{ total_paid: "0.00" }] });
        }
        if (sql.includes("INSERT INTO payments")) {
          return Promise.resolve({ rows: [{ id: "pay-1" }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      mocks.poolQuery.mockResolvedValue({
        rows: [{
          id: "pay-1",
          work_order_id: "order-1",
          work_order_code: "OT-2026-00001",
          client_name: "Mario Molina",
          amount: "500.00",
          method: "Efectivo",
          reference: null,
          notes: null,
          received_by_name: "Admin",
          created_at: "2026-01-01T10:00:00.000Z"
        }]
      });

      const result = await service.create({
        workOrderId: "order-1",
        amount: 500,
        method: "Efectivo"
      }, "user-admin");

      expect(mocks.clientQuery).toHaveBeenCalledWith("BEGIN");
      expect(mocks.clientQuery).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE"), ["order-1"]);
      expect(mocks.clientQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO payments"), expect.any(Array));
      expect(mocks.auditRecord).toHaveBeenCalledWith(
        "user-admin",
        "PAYMENT_RECORDED",
        "PAYMENT",
        "pay-1",
        expect.objectContaining({
          previousBalance: 3500,
          newBalance: 3000
        }),
        expect.anything()
      );
      expect(mocks.clientQuery).toHaveBeenCalledWith("COMMIT");
      expect(mocks.clientRelease).toHaveBeenCalled();
      expect(result.summary.financialStatus).toBe("PARTIAL");
      expect(result.summary.totalPaid).toBe(500);
      expect(result.summary.balance).toBe(3000);
    });

    it("records final payment reaching balance 0 and sets PAID status", async () => {
      mocks.clientQuery.mockImplementation((sql: string) => {
        if (sql === "BEGIN" || sql === "COMMIT") return Promise.resolve();
        if (sql.includes("FOR UPDATE")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: "order-1", code: "OT-2026-00001", total_amount: "3500.00", client_name: "Mario Molina" }]
          });
        }
        if (sql.includes("SELECT COALESCE(SUM(amount)")) {
          return Promise.resolve({ rows: [{ total_paid: "1500.00" }] });
        }
        if (sql.includes("INSERT INTO payments")) {
          return Promise.resolve({ rows: [{ id: "pay-final" }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      mocks.poolQuery.mockResolvedValue({
        rows: [{
          id: "pay-final",
          work_order_id: "order-1",
          work_order_code: "OT-2026-00001",
          client_name: "Mario Molina",
          amount: "2000.00",
          method: "Transferencia",
          reference: "REF-001",
          notes: null,
          received_by_name: "Admin",
          created_at: "2026-01-01T12:00:00.000Z"
        }]
      });

      const result = await service.create({
        workOrderId: "order-1",
        amount: 2000,
        method: "Transferencia",
        reference: "REF-001"
      }, "user-admin");

      expect(result.summary.balance).toBe(0);
      expect(result.summary.financialStatus).toBe("PAID");
    });

    it("rejects payment exceeding remaining balance and rolls back", async () => {
      mocks.clientQuery.mockImplementation((sql: string) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return Promise.resolve();
        if (sql.includes("FOR UPDATE")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: "order-1", code: "OT-2026-00001", total_amount: "3500.00", client_name: "Mario Molina" }]
          });
        }
        if (sql.includes("SELECT COALESCE(SUM(amount)")) {
          return Promise.resolve({ rows: [{ total_paid: "3000.00" }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await expect(service.create({
        workOrderId: "order-1",
        amount: 500.01,
        method: "Efectivo"
      }, "user-admin")).rejects.toMatchObject({
        statusCode: 422,
        code: "PAYMENT_EXCEEDS_BALANCE"
      });

      expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mocks.clientRelease).toHaveBeenCalled();
    });

    it("rejects payment when order is already fully paid (balance = 0)", async () => {
      mocks.clientQuery.mockImplementation((sql: string) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return Promise.resolve();
        if (sql.includes("FOR UPDATE")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: "order-1", code: "OT-2026-00001", total_amount: "3500.00", client_name: "Mario Molina" }]
          });
        }
        if (sql.includes("SELECT COALESCE(SUM(amount)")) {
          return Promise.resolve({ rows: [{ total_paid: "3500.00" }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await expect(service.create({
        workOrderId: "order-1",
        amount: 100,
        method: "Efectivo"
      }, "user-admin")).rejects.toMatchObject({
        statusCode: 422,
        code: "ORDER_ALREADY_PAID"
      });

      expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mocks.clientRelease).toHaveBeenCalled();
    });

    it("rejects payment when total_amount is not defined", async () => {
      mocks.clientQuery.mockImplementation((sql: string) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return Promise.resolve();
        if (sql.includes("FOR UPDATE")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: "order-1", code: "OT-2026-00001", total_amount: null, client_name: "Mario Molina" }]
          });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await expect(service.create({
        workOrderId: "order-1",
        amount: 500,
        method: "Efectivo"
      }, "user-admin")).rejects.toMatchObject({
        statusCode: 422,
        code: "ORDER_TOTAL_NOT_DEFINED"
      });

      expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mocks.clientRelease).toHaveBeenCalled();
    });

    it("rejects payment for non-existent order", async () => {
      mocks.clientQuery.mockImplementation((sql: string) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return Promise.resolve();
        if (sql.includes("FOR UPDATE")) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await expect(service.create({
        workOrderId: "missing-order",
        amount: 500,
        method: "Efectivo"
      }, "user-admin")).rejects.toMatchObject({
        statusCode: 404,
        code: "WORK_ORDER_NOT_FOUND"
      });

      expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mocks.clientRelease).toHaveBeenCalled();
    });
  });
});
