import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CashierOrders, CashierPayModal } from "./cashier-orders";
import type { CashierOrder } from "../models/cashier";
const mocks=vi.hoisted(()=>({api:vi.fn(),create:vi.fn()}));
vi.mock("@/shared/services/api",()=>({apiRequest:mocks.api}));
vi.mock("../services/cashier.service",()=>({cashierService:{create:mocks.create}}));
const order:CashierOrder={workOrderId:"order-1",workOrderCode:"OT-2026-00004",clientName:"Jose",totalAmount:500,totalPaid:100,balance:400,financialStatus:"PARTIAL",operationalStatus:"IN_PROGRESS",createdAt:"2026-10-22T12:00:00Z"};
beforeEach(()=>{vi.clearAllMocks();});
afterEach(cleanup);
describe("cashier order workflow",()=>{
  it("translates work status and offers charging only when an approved balance exists",()=>{
    render(<CashierOrders items={[order,{...order,workOrderId:"no-total",workOrderCode:"OT-2",totalAmount:null,balance:null},{...order,workOrderId:"paid",workOrderCode:"OT-3",balance:0,financialStatus:"PAID"}]} onPay={vi.fn()}/>);
    expect(screen.getAllByText("En proceso")).toHaveLength(3);
    expect(screen.queryByText("IN_PROGRESS")).toBeNull();
    expect(screen.getAllByRole("button",{name:"Cobrar"})).toHaveLength(1);
    expect(screen.getByText("Requiere cotización")).toBeTruthy();
    expect(screen.getByText("Sin saldo")).toBeTruthy();
  });
  it("opens a read-only summary and restores background scroll when closed",async()=>{
    mocks.api.mockResolvedValue({order:{...order,engineBrand:"Toyota",engineModel:"1HZ",engineSerial:null,serviceType:"Diagnóstico",description:"Falla de encendido",progress:40,assignedWorker:"Ana",estimatedDate:null,payments:[]}});
    render(<CashierOrders items={[order]} onPay={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Ver resumen OT-2026-00004"}));
    expect(await screen.findByText("Toyota 1HZ")).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getAllByRole("button",{name:"Cerrar"})[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
  it("shows remaining balance and requires a transfer reference before confirming",async()=>{
    const saved=vi.fn();mocks.create.mockResolvedValue({});
    render(<CashierPayModal order={order} onClose={vi.fn()} onSaved={saved}/>);
    fireEvent.change(screen.getByLabelText("Monto a cobrar (Q)"),{target:{value:"150"}});
    expect(screen.getByText(/Saldo después del pago/).textContent).toContain("250.00");
    fireEvent.change(screen.getByLabelText("Método de pago"),{target:{value:"Transferencia"}});
    const confirm=screen.getByRole("button",{name:/Confirmar Q/}) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Referencia bancaria (obligatoria)"),{target:{value:"BANCO-123"}});
    fireEvent.click(confirm);
    await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({amount:150,method:"Transferencia",reference:"BANCO-123"}));
  });
});
