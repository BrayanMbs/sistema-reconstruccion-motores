"use client";

import { useState } from "react";
import { Icon } from "@/shared/components/icon";
import type { Client } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { buildPublicTrackingUrl } from "../utils/tracking-link";
import { buildWhatsAppMessage, buildWhatsAppUrl, normalizeWhatsAppPhone } from "../utils/whatsapp";
import { TrackingQrModal } from "./tracking-qr-card";

export type TrackingShareActionsProps = {
  orderNumber: string;
  trackingCode: string;
  clientId: string;
  clientName: string;
  initialClientPhone?: string | null;
  className?: string;
  showLabels?: boolean;
};

/**
 * Grupo de acciones para compartir el seguimiento público de una orden de trabajo:
 * 1. Ver código QR en modal con opción de impresión.
 * 2. Copiar enlace público directo al portapapeles.
 * 3. Enviar seguimiento por WhatsApp al cliente (normalizando número y validando).
 */
export function TrackingShareActions({
  orderNumber,
  trackingCode,
  clientId,
  clientName,
  initialClientPhone,
  className = ""
}: TrackingShareActionsProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [phoneState, setPhoneState] = useState<string | null | undefined>(initialClientPhone);
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const trackingUrl = buildPublicTrackingUrl(orderNumber, trackingCode);

  const showFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  const handleCopyLink = async () => {
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
      showFeedback("Enlace copiado correctamente.", "success");
    } catch {
      showFeedback("No fue posible copiar el enlace.", "error");
    }
  };

  const handleWhatsApp = async () => {
    let targetPhone = phoneState;

    // Si aún no disponemos del teléfono, lo consultamos del endpoint de clientes según el rol activo
    if (targetPhone === undefined) {
      setLoadingPhone(true);
      try {
        const isAdmin =
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/admin") &&
          !window.location.pathname.startsWith("/administrativo");
        const primaryEndpoint = isAdmin
          ? `/api/admin/clients/${clientId}`
          : `/api/administrativo/clients/${clientId}`;
        const fallbackEndpoint = isAdmin
          ? `/api/administrativo/clients/${clientId}`
          : `/api/admin/clients/${clientId}`;

        let result: { client: Client };
        try {
          result = await apiRequest<{ client: Client }>(primaryEndpoint);
        } catch {
          result = await apiRequest<{ client: Client }>(fallbackEndpoint);
        }
        targetPhone = result.client?.phone ?? null;
        setPhoneState(targetPhone);
      } catch {
        showFeedback("No fue posible consultar el teléfono del cliente.", "error");
        setLoadingPhone(false);
        return;
      } finally {
        setLoadingPhone(false);
      }
    }

    const normalized = normalizeWhatsAppPhone(targetPhone);
    if (!normalized) {
      showFeedback("Este cliente no tiene un número de teléfono válido registrado.", "error");
      return;
    }

    const message = buildWhatsAppMessage({
      clientName,
      orderNumber,
      trackingUrl,
      trackingCode
    });

    const whatsappUrl = buildWhatsAppUrl(normalized, message);
    if (whatsappUrl && typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsQrOpen(true)}
          className="stitch-button stitch-button-secondary text-xs sm:text-sm"
          title="Ver código QR para escaneo"
        >
          <Icon name="qr_code" className="size-4 text-slate-700" />
          Ver QR
        </button>

        <button
          type="button"
          onClick={() => void handleWhatsApp()}
          disabled={loadingPhone}
          className="stitch-button stitch-button-secondary text-xs sm:text-sm hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-60"
          title="Enviar enlace por WhatsApp"
        >
          <Icon name="phone" className="size-4 text-emerald-600" />
          {loadingPhone ? "Cargando..." : "Enviar por WhatsApp"}
        </button>

        <button
          type="button"
          onClick={() => void handleCopyLink()}
          className="stitch-button stitch-button-secondary text-xs sm:text-sm"
          title="Copiar enlace directo de seguimiento"
        >
          <Icon name="content_copy" className="size-4 text-slate-700" />
          Copiar enlace
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <TrackingQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        orderNumber={orderNumber}
        trackingCode={trackingCode}
      />
    </div>
  );
}
