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
      <div className="stitch-card w-full max-w-lg overflow-hidden p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Icon name="edit" />
            </div>
            <div>
              <h3 id="order-total-modal-title" className="text-xl font-bold text-slate-900">
                {activeSummary?.totalAmount === null ? "Definir cotización / total" : "Actualizar total de orden"}
              </h3>
              <p className="text-xs text-slate-500">
                Establece el monto total aprobado para la reconstrucción
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-semibold text-slate-500">
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
                className={`stitch-input w-full pl-8 ${isLessThanPaid ? "border-red-400 focus:border-red-500" : ""}`}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            {isLessThanPaid && activeSummary && (
              <p className="mt-1 text-xs font-medium text-red-600">
                El total aprobado no puede ser menor a los pagos ya registrados (Q {activeSummary.totalPaid.toFixed(2)}).
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Al guardar, el saldo pendiente y el estado de la orden se recalcularán automáticamente.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
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
