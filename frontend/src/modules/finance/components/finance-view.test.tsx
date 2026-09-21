import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderFinancialSummary, Payment } from "../models/finance";
import { FinanceView } from "./finance-view";
import { PaymentModal } from "./payment-modal";
import { OrderTotalModal } from "./order-total-modal";
import { financeService } from "../services/finance.service";

const mockPayments: Payment[] = [
  {
    id: "pay-1",
    workOrderId: "order-1",
    workOrderCode: "OT-2026-00001",
    clientName: "Transportes Unidos",
    amount: 1500,
    method: "Transferencia",
    reference: "TRANS-99881",
    notes: "Anticipo 50%",
    receivedBy: "Admin",
    createdAt: "2026-02-01T10:00:00.000Z"
  }
];

const mockSummaries: OrderFinancialSummary[] = [
  {
    workOrderId: "order-1",
    workOrderCode: "OT-2026-00001",
    clientName: "Transportes Unidos",
    totalAmount: 3000,
    totalPaid: 1500,
    balance: 1500,
    financialStatus: "PARTIAL"
  },
  {
    workOrderId: "order-2",
    workOrderCode: "OT-2026-00002",
    clientName: "Logística Express",
    totalAmount: 5000,
    totalPaid: 5000,
    balance: 0,
    financialStatus: "PAID"
  },
  {
    workOrderId: "order-3",
    workOrderCode: "OT-2026-00003",
    clientName: "Flotas del Norte",
    totalAmount: null,
    totalPaid: 0,
    balance: null,
    financialStatus: "PENDING"
  }
];

describe("Finance Module Components", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(financeService, "listPayments").mockResolvedValue(mockPayments);
    vi.spyOn(financeService, "listOrderFinanceSummaries").mockResolvedValue(mockSummaries);
    vi.spyOn(financeService, "createPayment").mockResolvedValue({
      payment: {
        id: "pay-new",
        workOrderId: "order-1",
        workOrderCode: "OT-2026-00001",
        clientName: "Transportes Unidos",
        amount: 500,
        method: "Efectivo",
        reference: null,
        notes: null,
        receivedBy: "Admin",
        createdAt: new Date().toISOString()
      },
      summary: {
        workOrderId: "order-1",
        workOrderCode: "OT-2026-00001",
        clientName: "Transportes Unidos",
        totalAmount: 3000,
        totalPaid: 2000,
        balance: 1000,
        financialStatus: "PARTIAL"
      }
    });
    vi.spyOn(financeService, "updateOrderTotal").mockResolvedValue({
      workOrderId: "order-3",
      workOrderCode: "OT-2026-00003",
      clientName: "Flotas del Norte",
      totalAmount: 4500,
      totalPaid: 0,
      balance: 4500,
      financialStatus: "PENDING"
    });
  });

  it("renders FinanceView with summary KPI metrics and order table", async () => {
    render(<FinanceView />);

    expect(await screen.findByText("Finanzas y Cobros")).toBeTruthy();
    expect(await screen.findByText("Transportes Unidos")).toBeTruthy();
    expect(screen.getByText("Logística Express")).toBeTruthy();
    expect(screen.getByText("Flotas del Norte")).toBeTruthy();

    // Check KPI cards
    expect(screen.getByText("Ingresos registrados")).toBeTruthy();
    expect(screen.getByText("Saldo por cobrar")).toBeTruthy();
    expect(screen.getByText("Órdenes pagadas")).toBeTruthy();
    expect(screen.getByText("Pendientes de cotizar")).toBeTruthy();
  });

  it("switches to Payment History tab and displays payments", async () => {
    render(<FinanceView />);

    await screen.findByText("Finanzas y Cobros");
    const historyTab = screen.getByRole("button", { name: /Historial de Pagos/i });
    fireEvent.click(historyTab);

    expect(await screen.findByText("TRANS-99881")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("Transferencia")).toBeTruthy();
  });

  it("validates PaymentModal: prevents amount exceeding balance and enforces transfer reference", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        orderSummaries={mockSummaries}
        preselectedOrderId="order-1"
      />
    );

    // Selected order is order-1 with balance 1500
    expect(screen.getByText("OT-2026-00001")).toBeTruthy();

    const amountInput = screen.getByLabelText(/Monto a pagar/i);
    const methodSelect = screen.getByLabelText(/Método de pago/i);
    const submitBtn = screen.getByRole("button", { name: /Guardar pago/i }) as HTMLButtonElement;

    // 1. Enter amount exceeding balance (2000 > 1500)
    fireEvent.change(amountInput, { target: { value: "2000" } });
    expect(screen.getByText(/El monto excede el saldo pendiente/i)).toBeTruthy();
    expect(submitBtn.disabled).toBe(true);

    // 2. Enter valid amount
    fireEvent.change(amountInput, { target: { value: "500" } });
    expect(screen.queryByText(/El monto excede el saldo pendiente/i)).toBeNull();
    // Default method is Efectivo, so submit button should now be enabled
    expect(submitBtn.disabled).toBe(false);

    // 3. Change to Transferencia without reference
    fireEvent.change(methodSelect, { target: { value: "Transferencia" } });
    expect(screen.getByText(/El número de comprobante o referencia es obligatorio/i)).toBeTruthy();
    expect(submitBtn.disabled).toBe(true);

    // 4. Fill in reference
    const refInput = screen.getByLabelText(/Referencia/i);
    fireEvent.change(refInput, { target: { value: "TRANS-12345" } });
    expect(screen.queryByText(/El número de comprobante o referencia es obligatorio/i)).toBeNull();
    expect(submitBtn.disabled).toBe(false);

    // 5. Submit form
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(financeService.createPayment).toHaveBeenCalledWith({
        workOrderId: "order-1",
        amount: 500,
        method: "Transferencia",
        reference: "TRANS-12345",
        notes: null
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("blocks payments for orders with no total defined or already paid in PaymentModal", () => {
    const { rerender } = render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        orderSummaries={mockSummaries}
        preselectedOrderId="order-3" // totalAmount is null
      />
    );

    expect(screen.getByText(/Esta orden aún no tiene un monto total aprobado/i)).toBeTruthy();
    expect((screen.getByLabelText(/Monto a pagar/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Guardar pago/i }) as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        orderSummaries={mockSummaries}
        preselectedOrderId="order-2" // paid in full
      />
    );

    expect(screen.getByText(/Esta orden ya ha sido cancelada en su totalidad/i)).toBeTruthy();
    expect((screen.getByLabelText(/Monto a pagar/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Guardar pago/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("validates OrderTotalModal: prevents setting total less than already paid", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <OrderTotalModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        orderSummary={mockSummaries[0]} // totalPaid is 1500
      />
    );

    expect(screen.getByText("OT-2026-00001")).toBeTruthy();
    const totalInput = screen.getByLabelText(/Monto total aprobado/i);
    const saveBtn = screen.getByRole("button", { name: /Guardar total/i }) as HTMLButtonElement;

    // Enter total less than 1500 (e.g. 1000)
    fireEvent.change(totalInput, { target: { value: "1000" } });
    expect(screen.getByText(/El total aprobado no puede ser menor a los pagos ya registrados/i)).toBeTruthy();
    expect(saveBtn.disabled).toBe(true);

    // Enter valid total (e.g. 3500)
    fireEvent.change(totalInput, { target: { value: "3500" } });
    expect(screen.queryByText(/El total aprobado no puede ser menor/i)).toBeNull();
    expect(saveBtn.disabled).toBe(false);

    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(financeService.updateOrderTotal).toHaveBeenCalledWith("order-1", {
        totalAmount: 3500
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
