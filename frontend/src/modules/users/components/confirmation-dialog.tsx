"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ConfirmationDialogProps = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar diálogo"
        disabled={loading}
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="stitch-card relative my-auto w-full max-w-md p-4 sm:p-6"
      >
        <h3 id={titleId} className="text-xl font-bold text-slate-900">{title}</h3>
        <div className="mt-3 text-sm leading-6 text-slate-600">{message}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={loading}
            className="stitch-button stitch-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            className={`stitch-button w-full text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
              destructive ? "bg-red-700 hover:bg-red-800" : "stitch-button-primary"
            }`}
            onClick={onConfirm}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
