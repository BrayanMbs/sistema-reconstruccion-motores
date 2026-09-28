"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/shared/components/icon";
import { buildPublicTrackingUrl } from "../utils/tracking-link";

export type TrackingQrCardProps = {
  orderNumber: string;
  trackingCode: string;
  className?: string;
};

/**
 * Tarjeta presentable y lista para impresión con el código QR y datos
 * de acceso público al seguimiento de la orden.
 */
export function TrackingQrCard({ orderNumber, trackingCode, className = "" }: TrackingQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const trackingUrl = buildPublicTrackingUrl(orderNumber, trackingCode);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(trackingUrl, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M"
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch((error) => {
        console.error("Error al generar código QR:", error);
      });

    return () => {
      active = false;
    };
  }, [trackingUrl]);

  return (
    <div className={`tracking-qr-printable rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-sm ${className}`}>
      <div className="border-b border-slate-200 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reconstrucción de Motores</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Orden: {orderNumber}</h2>
      </div>

      <div className="my-5 flex flex-col items-center justify-center">
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qrDataUrl}
            alt={`Código QR de seguimiento para la orden ${orderNumber}`}
            className="size-48 rounded-lg border border-slate-200 bg-white p-2 shadow-inner sm:size-52"
          />
        ) : (
          <div className="flex size-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 sm:size-52">
            Generando código QR...
          </div>
        )}
        <p className="mt-3 text-xs font-medium text-slate-600 sm:text-sm">
          Escanee este código para consultar el avance de su trabajo.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Código de seguimiento</p>
        <p className="mt-1 select-all font-mono text-xs font-bold tracking-wider text-slate-900 sm:text-sm break-all">
          {trackingCode}
        </p>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Portal seguro de seguimiento · No requiere contraseña
      </p>
    </div>
  );
}

export type TrackingQrModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  trackingCode: string;
};

/**
 * Modal flotante que presenta la tarjeta de QR con opciones de imprimir,
 * copiar enlace y cerrar.
 */
export function TrackingQrModal({
  isOpen,
  onClose,
  orderNumber,
  trackingCode
}: TrackingQrModalProps) {
  const [copyFeedback, setCopyFeedback] = useState("");
  const trackingUrl = buildPublicTrackingUrl(orderNumber, trackingCode);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    document.body.classList.add("printing-qr-modal");

    const cleanup = () => {
      document.body.classList.remove("printing-qr-modal");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
    // Respaldo por si el navegador no dispara afterprint
    setTimeout(cleanup, 2000);
  };

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(trackingUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = trackingUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyFeedback("Enlace copiado correctamente.");
      setTimeout(() => setCopyFeedback(""), 3500);
    } catch {
      setCopyFeedback("No fue posible copiar el enlace.");
      setTimeout(() => setCopyFeedback(""), 3500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-qr-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs tracking-qr-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="tracking-qr-no-print mb-4 flex items-center justify-between">
          <h2 id="tracking-qr-title" className="text-lg font-bold text-slate-900">
            Acceso de seguimiento
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <TrackingQrCard orderNumber={orderNumber} trackingCode={trackingCode} />

        {copyFeedback && (
          <p
            role="status"
            className="tracking-qr-no-print mt-3 rounded-lg bg-emerald-50 p-2 text-center text-xs font-semibold text-emerald-800 border border-emerald-200"
          >
            {copyFeedback}
          </p>
        )}

        <div className="tracking-qr-no-print mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={handleCopy}
            className="stitch-button stitch-button-secondary text-xs sm:text-sm"
          >
            <Icon name="content_copy" className="size-4" />
            Copiar enlace
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="stitch-button stitch-button-primary text-xs sm:text-sm"
          >
            <Icon name="print" className="size-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="stitch-button stitch-button-secondary text-xs sm:text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
