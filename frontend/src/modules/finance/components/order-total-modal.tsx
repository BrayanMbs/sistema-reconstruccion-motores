"use client";

import { FormEvent, useEffect, useState } from "react";
import type { OrderFinancialSummary } from "../models/finance";
import { financeService } from "../services/finance.service";
import { Icon } from "@/shared/components/icon";

type OrderTotalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: OrderFinancialSummary) => void;
  orderSummary?: OrderFinancialSummary | null;
  orderSummaries?: OrderFinancialSummary[];
};

export function OrderTotalModal({
  isOpen,
  onClose,
  onSuccess,
  orderSummary: initialOrderSummary,
  orderSummaries = []
}: OrderTotalModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialOrderSummary) {
        setSelectedOrderId(initialOrderSummary.workOrderId);
        setTotalAmount(
          initialOrderSummary.totalAmount !== null ? String(initialOrderSummary.totalAmount) : ""
        );
      } else {
        setSelectedOrderId("");
        setTotalAmount("");
      }
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialOrderSummary]);

  const activeSummary =
    initialOrderSummary && initialOrderSummary.workOrderId === selectedOrderId
      ? initialOrderSummary
      : orderSummaries.find((o) => o.workOrderId === selectedOrderId) ?? initialOrderSummary;

  useEffect(() => {
    if (!initialOrderSummary && selectedOrderId) {
      const found = orderSummaries.find((o) => o.workOrderId === selectedOrderId);
      if (found) {
        setTotalAmount(found.totalAmount !== null ? String(found.totalAmount) : "");
      }
    }
  }, [selectedOrderId, initialOrderSummary, orderSummaries]);

  if (!isOpen) {
    return null;
  }

  const numTotal = parseFloat(totalAmount);
  const hasValidTotal = !isNaN(numTotal) && numTotal > 0;
  const isLessThanPaid = activeSummary ? hasValidTotal && numTotal < activeSummary.totalPaid : false;
  const canSubmit = !isSubmitting && Boolean(activeSummary) && hasValidTotal && !isLessThanPaid;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !activeSummary) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updated = await financeService.updateOrderTotal(activeSummary.workOrderId, {
        totalAmount: Math.round(numTotal * 100) / 100
      });
      onSuccess(updated);
      onClose();
    } catch (error) {
      setSubmitError((error as Error).message || "Ocurrió un error al actualizar el total");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-total-modal-title"
    >
      <div className="stitch-card max-h-[90dvh] w-full max-w-xl overflow-y-auto p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon name="edit" />
            </div>
            <div>
              <h3 id="order-total-modal-title" className="text-xl font-bold text-slate-900">
                {activeSummary?.totalAmount === null ? "Definir cotización / total" : "Actualizar total de orden"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Define el importe final aprobado para esta orden.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar modal"
          >
            <Icon name="close" />
          </button>
        </div>

        {submitError && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {!initialOrderSummary && (
            <div>
              <label htmlFor="order-select-total" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Seleccione la orden <span className="text-red-500">*</span>
              </label>
              <select
                id="order-select-total"
                required
                className="stitch-input w-full"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                <option value="">Seleccione una orden de trabajo</option>
                {orderSummaries.map((order) => (
                  <option key={order.workOrderId} value={order.workOrderId}>
                    {order.workOrderCode} · {order.clientName} {order.totalAmount !== null ? `(Total actual: Q ${order.totalAmount.toFixed(2)})` : "(Sin cotizar)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSummary && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-slate-500">Orden de trabajo</span>
                  <span className="font-semibold text-slate-900">{activeSummary.workOrderCode}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Cliente</span>
                  <span className="font-semibold text-slate-900">{activeSummary.clientName}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Total aprobado actual</span>
                  <span className="font-semibold text-slate-900">
                    {activeSummary.totalAmount !== null ? `Q ${activeSummary.totalAmount.toFixed(2)}` : "Sin definir"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Pagos ya registrados</span>
                  <span className="font-bold text-emerald-700">
                    Q {activeSummary.totalPaid.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="order-total-amount" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Monto total aprobado (Q) <span className="text-red-500">*</span>
            </label>
            <div className={`flex overflow-hidden rounded-lg border bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 ${isLessThanPaid ? "border-red-400" : "border-slate-300"}`}>
              <span aria-hidden="true" className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 font-semibold text-slate-500">
                Q
              </span>
              <input
                id="order-total-amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                disabled={!activeSummary}
                placeholder="0.00"
                className="h-12 w-full min-w-0 border-0 bg-transparent px-3 text-lg font-semibold tabular-nums text-slate-900 outline-none"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            {isLessThanPaid && activeSummary && (
              <p className="mt-1 text-xs font-medium text-red-600">
                El total aprobado no puede ser menor a los pagos ya registrados (Q {activeSummary.totalPaid.toFixed(2)}).
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Incluye los repuestos ya aprobados. El saldo y el estado del pago se actualizarán al guardar.
            </p>
          </div>

          {hasValidTotal && !isLessThanPaid && activeSummary && <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">Saldo pendiente al guardar</span><strong className="text-lg tabular-nums text-slate-900">{new Intl.NumberFormat("es-GT", {style:"currency",currency:"GTQ"}).format(Math.max(0,numTotal-activeSummary.totalPaid))}</strong></div>}
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="stitch-button stitch-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="stitch-button stitch-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar total"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
