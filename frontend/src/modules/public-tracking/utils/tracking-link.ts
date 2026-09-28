/**
 * Utilidad para construir el enlace público de seguimiento de una orden de trabajo.
 *
 * Utiliza URL y URLSearchParams para garantizar la correcta codificación
 * y escape de parámetros.
 *
 * En cliente o producción, resuelve el origen absoluto a través de:
 * 1. Parámetro `origin` explícito (si se suministra).
 * 2. Variable pública `NEXT_PUBLIC_APP_URL` (si está definida).
 * 3. `window.location.origin` (en tiempo de ejecución en el navegador).
 * 4. Ruta relativa `/seguimiento?...` como último respaldo.
 */
export function buildPublicTrackingUrl(
  orderNumber: string,
  trackingCode: string,
  origin?: string
): string {
  const envBase = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL : undefined;
  const windowOrigin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : undefined;
  const rawBase = (origin ?? envBase ?? windowOrigin ?? "").trim();
  const base = rawBase.replace(/\/+$/, "");

  // Si no hay base absoluta, usamos un origen de respaldo para la API URL estándar
  const dummyBase = "https://local.placeholder";
  const url = new URL("/seguimiento", base || dummyBase);

  url.searchParams.set("order", orderNumber.trim());
  url.searchParams.set("code", trackingCode.trim());

  if (!base) {
    return `${url.pathname}${url.search}`;
  }

  return url.toString();
}
