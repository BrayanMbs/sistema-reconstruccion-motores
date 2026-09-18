import type { PublicOrderTrackingQueryDto } from "../dtos/admin.dtos";
import { AppError } from "../utils/app-error";

const orderNumberPattern = /^OT-\d{4}-\d{5}$/;
const trackingCodePattern = /^MTR-[A-F0-9]{24}$/;

export const parsePublicTrackingQuery = (body: unknown): PublicOrderTrackingQueryDto => {
  const value = body as Record<string, unknown>;
  const orderNumber = typeof value?.orderNumber === "string" ? value.orderNumber.trim() : "";
  const trackingCode = typeof value?.trackingCode === "string" ? value.trackingCode.trim() : "";
  if (!orderNumber || !trackingCode) throw new AppError("Ingresa el número de orden y el código de seguimiento.", 422, "VALIDATION_ERROR");
  if (!orderNumberPattern.test(orderNumber) || !trackingCodePattern.test(trackingCode)) {
    throw new AppError("No se pudo encontrar una orden con los datos proporcionados.", 422, "VALIDATION_ERROR");
  }
  return { orderNumber, trackingCode };
};
