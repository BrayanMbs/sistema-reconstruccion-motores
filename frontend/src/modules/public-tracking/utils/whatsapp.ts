/**
 * Normaliza un número telefónico para su uso con la API de WhatsApp,
 * aplicando las reglas específicas para Guatemala (+502).
 *
 * Reglas:
 * - 55551234 => 50255551234 (número local de 8 dígitos)
 * - +502 5555-1234 => 50255551234 (ya incluye código país)
 * - 50255551234 => 50255551234 (ya normalizado)
 * - Elimina espacios, guiones, paréntesis y caracteres no numéricos.
 * - Si el teléfono es nulo, vacío o malformado, retorna null.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Extraer únicamente los dígitos numéricos
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // Manejar prefijos internacionales con ceros iniciales (e.g. 00502)
  const cleaned = digits.startsWith("00") ? digits.slice(2) : digits;

  // Formato local de Guatemala: exactamente 8 dígitos
  if (cleaned.length === 8) {
    return `502${cleaned}`;
  }

  // Formato Guatemala con código de país 502: 11 dígitos que inician con 502
  if (cleaned.length === 11 && cleaned.startsWith("502")) {
    return cleaned;
  }

  // Formato internacional general E.164 si se indicó explícitamente con signo '+'
  if (trimmed.startsWith("+") && cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }

  return null;
}

export type WhatsAppMessageParams = {
  clientName: string;
  orderNumber: string;
  trackingUrl: string;
  trackingCode: string;
};

/**
 * Construye el mensaje formal que se enviará al cliente por WhatsApp.
 *
 * Garantiza que NO incluya información financiera (precios, saldos, pagos),
 * notas internas, identificadores UUID ni tokens.
 */
export function buildWhatsAppMessage({
  clientName,
  orderNumber,
  trackingUrl,
  trackingCode
}: WhatsAppMessageParams): string {
  const name = clientName.trim() || "Estimado cliente";
  const order = orderNumber.trim();
  const url = trackingUrl.trim();
  const code = trackingCode.trim();

  return [
    `Hola, ${name}.`,
    "",
    `Su orden de trabajo ${order} ya puede consultarse en línea.`,
    "",
    "Puede revisar el avance de su trabajo en el siguiente enlace:",
    url,
    "",
    "Código de seguimiento:",
    code,
    "",
    "Gracias."
  ].join("\n");
}

/**
 * Genera el enlace directo a WhatsApp (https://wa.me/NUMERO?text=MENSAJE)
 * codificando el mensaje de forma segura mediante URLSearchParams.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return "";

  const params = new URLSearchParams();
  params.set("text", message);

  return `https://wa.me/${normalizedPhone}?${params.toString()}`;
}
