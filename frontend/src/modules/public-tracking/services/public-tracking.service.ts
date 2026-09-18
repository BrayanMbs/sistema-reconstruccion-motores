import { ApiError, apiBaseUrl } from "@/shared/services/api";
import type { PublicOrderTracking, PublicTrackingQuery } from "../models/public-tracking";

/** Public endpoint intentionally bypasses session-token handling. */
export const findPublicTracking = async (input: PublicTrackingQuery): Promise<PublicOrderTracking> => {
  const response = await fetch(`${apiBaseUrl}/api/public/orders/tracking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message ?? "No fue posible realizar la consulta.", response.status, body.code);
  return body.tracking as PublicOrderTracking;
};
