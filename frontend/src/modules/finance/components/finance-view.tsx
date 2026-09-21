"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderFinancialSummary, Payment } from "../models/finance";
import { financeService } from "../services/finance.service";
import { FinancialSummaryCards } from "./financial-summary";
import { OrderFinanceTable } from "./order-finance-table";
import { PaymentHistoryTable } from "./payment-history";
import { PaymentModal } from "./payment-modal";
import { OrderTotalModal } from "./order-total-modal";
import { Icon } from "@/shared/components/icon";

type MainViewTab = "ORDERS" | "PAYMENTS";

export function FinanceView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orderSummaries, setOrderSummaries] = useState<OrderFinancialSummary[]>([]);
  const [activeTab, setActiveTab] = useState<MainViewTab>("ORDERS");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentPreselectedOrderId, setPaymentPreselectedOrderId] = useState<string | null>(null);

  const [isOrderTotalModalOpen, setIsOrderTotalModalOpen] = useState<boolean>(false);
  const [selectedOrderSummaryForTotal, setSelectedOrderSummaryForTotal] = useState<OrderFinancialSummary | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const [fetchedPayments, fetchedSummaries] = await Promise.all([
        financeService.listPayments(),
        financeService.listOrderFinanceSummaries()
      ]);
      setPayments(fetchedPayments);
      setOrderSummaries(fetchedSummaries);
    } catch (caught) {
      setErrorMessage((caught as Error).message || "Error al cargar los datos financieros");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenPaymentModal = (order?: OrderFinancialSummary) => {
    setPaymentPreselectedOrderId(order ? order.workOrderId : null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenTotalModal = (order?: OrderFinancialSummary) => {
    setSelectedOrderSummaryForTotal(order ?? null);
    setIsOrderTotalModalOpen(true);
  };

  const handlePaymentSuccess = (payment: Payment, summary: OrderFinancialSummary) => {
    setSuccessMessage(
      `Pago de Q ${payment.amount.toFixed(2)} registrado exitosamente para la orden ${payment.workOrderCode}.`
    );
    // Update local state smoothly
    setPayments((prev) => [payment, ...prev]);
    setOrderSummaries((prev) =>
      prev.map((item) => (item.workOrderId === summary.workOrderId ? summary : item))
    );
    // Also trigger full background refresh
    void loadData(true);
  };

  const handleTotalSuccess = (updatedSummary: OrderFinancialSummary) => {
    setSuccessMessage(
      `Total de la orden ${updatedSummary.workOrderCode} actualizado a Q ${updatedSummary.totalAmount?.toFixed(2)}.`
    );
    setOrderSummaries((prev) =>
      prev.map((item) => (item.workOrderId === updatedSummary.workOrderId ? updatedSummary : item))
    );
    void loadData(true);
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
              Finanzas y Cobros
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Módulo Financiero
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Control de cotizaciones aprobadas, abonos recibidos, saldos pendientes y pagos parciales por orden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="stitch-button stitch-button-secondary"
            title="Actualizar datos"
            disabled={isLoading}
          >
            <Icon name="refresh" className={isLoading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenTotalModal()}
            className="stitch-button stitch-button-secondary"
          >
            <Icon name="edit" />
            <span>Definir total</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPaymentModal()}
            className="stitch-button stitch-button-primary"
          >
            <Icon name="payments" />
            <span>Registrar pago</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">Error:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-900"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">Éxito:</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <FinancialSummaryCards payments={payments} orderSummaries={orderSummaries} />

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("ORDERS")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "ORDERS"
              ? "bg-blue-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Icon name="assessment" />
          <span>Órdenes y Saldos</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === "ORDERS" ? "bg-blue-800 text-blue-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {orderSummaries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PAYMENTS")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "PAYMENTS"
              ? "bg-blue-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Icon name="payments" />
          <span>Historial de Pagos</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === "PAYMENTS" ? "bg-blue-800 text-blue-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {payments.length}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      {isLoading && payments.length === 0 && orderSummaries.length === 0 ? (
        <div className="stitch-card flex h-64 items-center justify-center">
          <p className="text-sm text-slate-500">Cargando información financiera...</p>
        </div>
      ) : activeTab === "ORDERS" ? (
        <OrderFinanceTable
          orderSummaries={orderSummaries}
          onDefineTotal={handleOpenTotalModal}
          onRegisterPayment={handleOpenPaymentModal}
        />
      ) : (
        <PaymentHistoryTable payments={payments} />
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentPreselectedOrderId(null);
        }}
        onSuccess={handlePaymentSuccess}
        orderSummaries={orderSummaries}
        preselectedOrderId={paymentPreselectedOrderId}
      />

      <OrderTotalModal
        isOpen={isOrderTotalModalOpen}
        onClose={() => {
          setIsOrderTotalModalOpen(false);
          setSelectedOrderSummaryForTotal(null);
        }}
        onSuccess={handleTotalSuccess}
        orderSummary={selectedOrderSummaryForTotal}
        orderSummaries={orderSummaries}
      />
    </div>
  );
}
