"use client";

import { FormEvent, useEffect, useState } from "react";
import type { OrderFinancialSummary, Payment } from "../models/finance";
import { FINANCIAL_STATUS_BADGE_CLASSES, FINANCIAL_STATUS_LABELS } from "../models/finance";
import { financeService } from "../services/finance.service";
import { Icon } from "@/shared/components/icon";

type PaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: Payment, summary: OrderFinancialSummary) => void;
  orderSummaries: OrderFinancialSummary[];
  preselectedOrderId?: string | null;
};

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  orderSummaries,
  preselectedOrderId
}: PaymentModalProps) {
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("Efectivo");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWorkOrderId(preselectedOrderId ?? "");
      setAmount("");
      setMethod("Efectivo");
      setReference("");
      setNotes("");
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, preselectedOrderId]);

  if (!isOpen) {
    return null;
  }

  const selectedOrder = orderSummaries.find((o) => o.workOrderId === workOrderId);
  const numAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(numAmount) && numAmount > 0;
  const isMissingTotal = selectedOrder ? selectedOrder.totalAmount === null : false;
  const isAlreadyPaid = selectedOrder ? selectedOrder.totalAmount !== null && (selectedOrder.balance ?? 0) <= 0 : false;
  const isExceedingBalance =
    selectedOrder && selectedOrder.balance !== null && hasValidAmount && numAmount > selectedOrder.balance;
  const isTransfer = method === "Transferencia";
  const isMissingReference = isTransfer && reference.trim().length === 0;

  const canSubmit =
    !isSubmitting &&
    Boolean(selectedOrder) &&
    !isMissingTotal &&
    !isAlreadyPaid &&
    hasValidAmount &&
    !isExceedingBalance &&
    !isMissingReference;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !selectedOrder) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await financeService.createPayment({
        workOrderId,
        amount: Math.round(numAmount * 100) / 100,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null
      });
      onSuccess(response.payment, response.summary);
      onClose();
    } catch (error) {
      setSubmitError((error as Error).message || "Ocurrió un error al registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="stitch-card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon name="payments" />
            </div>
            <div>
              <h3 id="payment-modal-title" className="text-xl font-bold text-slate-900">
                Registrar pago
              </h3>
              <p className="text-xs text-slate-500">
                Abono o liquidación a una orden de trabajo
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
          <div>
            <label htmlFor="payment-order-select" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Orden de trabajo <span className="text-red-500">*</span>
            </label>
            <select
              id="payment-order-select"
              required
              className="stitch-input w-full"
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
            >
              <option value="">Seleccione una orden de trabajo</option>
              {orderSummaries.map((order) => (
                <option key={order.workOrderId} value={order.workOrderId}>
                  {order.workOrderCode} · {order.clientName} {order.balance !== null ? `(Saldo: Q ${order.balance.toFixed(2)})` : "(Sin total)"}
                </option>
              ))}
            </select>
          </div>

          {selectedOrder && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/75 p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="font-semibold text-slate-900">{selectedOrder.workOrderCode}</span>
                  <span className="ml-2 text-slate-600">{selectedOrder.clientName}</span>
                </div>
                {selectedOrder.totalAmount !== null ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 font-medium ${
                      FINANCIAL_STATUS_BADGE_CLASSES[selectedOrder.financialStatus]
                    }`}
                  >
                    {FINANCIAL_STATUS_LABELS[selectedOrder.financialStatus]}
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-300 bg-slate-200 px-2 py-0.5 font-medium text-slate-700">
                    Sin total aprobado
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-white p-2 shadow-2xs">
                  <p className="text-slate-500">Total aprobado</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">
                    {selectedOrder.totalAmount !== null ? `Q ${selectedOrder.totalAmount.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="rounded bg-white p-2 shadow-2xs">
                  <p className="text-slate-500">Total pagado</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-700">
                    Q {selectedOrder.totalPaid.toFixed(2)}
                  </p>
                </div>
                <div className="rounded bg-white p-2 shadow-2xs">
                  <p className="text-slate-500">Saldo pendiente</p>
                  <p className="mt-0.5 text-sm font-bold text-amber-700">
                    {selectedOrder.balance !== null ? `Q ${selectedOrder.balance.toFixed(2)}` : "—"}
                  </p>
                </div>
              </div>

              {isMissingTotal && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
                  <strong className="block font-semibold">Total no definido</strong>
                  Esta orden aún no tiene un monto total aprobado. Primero debe definir el total de la orden para poder registrar abonos.
                </div>
              )}

              {isAlreadyPaid && (
                <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-800">
                  <strong className="block font-semibold">Orden completamente pagada</strong>
                  Esta orden ya ha sido cancelada en su totalidad. El saldo pendiente es Q 0.00.
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="payment-amount" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Monto a pagar (Q) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-semibold text-slate-500">
                  Q
                </span>
                <input
                  id="payment-amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  disabled={!selectedOrder || isMissingTotal || isAlreadyPaid}
                  placeholder="0.00"
                  className={`stitch-input w-full pl-8 ${isExceedingBalance ? "border-red-400 focus:border-red-500" : ""}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {isExceedingBalance && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  El monto excede el saldo pendiente (Q {selectedOrder?.balance?.toFixed(2)}).
                </p>
              )}
            </div>

            <div>
              <label htmlFor="payment-method" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Método de pago <span className="text-red-500">*</span>
              </label>
              <select
                id="payment-method"
                className="stitch-input w-full"
                value={method}
                disabled={!selectedOrder || isMissingTotal || isAlreadyPaid}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia bancaria</option>
                <option value="Tarjeta">Tarjeta de crédito / débito</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="payment-reference" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Referencia {isTransfer && <span className="text-red-500">* (Obligatorio en transferencia)</span>}
            </label>
            <input
              id="payment-reference"
              type="text"
              placeholder={isTransfer ? "No. de boleta, transferencia o autorización" : "Opcional (No. comprobante)"}
              className={`stitch-input w-full ${isMissingReference ? "border-red-400 focus:border-red-500" : ""}`}
              value={reference}
              disabled={!selectedOrder || isMissingTotal || isAlreadyPaid}
              onChange={(e) => setReference(e.target.value)}
            />
            {isMissingReference && (
              <p className="mt-1 text-xs font-medium text-red-600">
                El número de comprobante o referencia es obligatorio para pagos por transferencia.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="payment-notes" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Notas u observaciones
            </label>
            <textarea
              id="payment-notes"
              rows={2}
              placeholder="Detalles adicionales sobre el pago..."
              className="stitch-input h-20 w-full py-2"
              value={notes}
              disabled={!selectedOrder || isMissingTotal || isAlreadyPaid}
              onChange={(e) => setNotes(e.target.value)}
            />
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
              {isSubmitting ? "Registrando..." : "Guardar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
