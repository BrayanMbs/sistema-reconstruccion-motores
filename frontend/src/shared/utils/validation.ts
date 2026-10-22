// Client-side input validation and security patterns

const SQL_INJECTION_PATTERNS = [
  /(?:'|")\s*(?:OR|AND)\s*(?:'|"|\d|true|false|\w)/i,
  /\b(?:OR|AND)\s+['"\w\d]+\s*=\s*['"\w\d]+/i,
  /\b(?:OR|AND)\s+\d+\s*=\s*\d+/i,
  /(?:'|")\s*=\s*(?:'|")/,
  /(?:--|\/\*|\*\/)/,
  /;\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b/i,
  /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
  /\b(?:DROP|TRUNCATE|ALTER)\s+TABLE\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bDELETE\s+FROM\b/i,
  /\b(?:SLEEP|BENCHMARK|PG_SLEEP|WAITFOR\s+DELAY)\s*\(/i,
  /0x[0-9a-fA-F]{4,}/
];

const XSS_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<svg\b/i,
  /<img\b[^>]*\bonerror\b/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /\bon\w+\s*=\s*['"][^'"]*['"]/i
];

const CONTROL_CHARS_PATTERN = /[\x00-\x1F\x7F]/;

export function hasSqlInjectionPattern(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

export function hasXssPattern(value: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(value));
}

export function validateSafeText(
  value: string,
  fieldName = "El texto",
  maxLength?: number
): string | null {
  if (typeof value !== "string") return `${fieldName} es obligatorio.`;
  const normalized = value.normalize("NFC");
  if (CONTROL_CHARS_PATTERN.test(normalized.replace(/[\r\n\t]/g, ""))) {
    return `${fieldName} contiene caracteres no permitidos.`;
  }
  if (hasSqlInjectionPattern(normalized)) {
    return `${fieldName} contiene caracteres o expresiones no permitidas (patrones de inyección detectados).`;
  }
  if (hasXssPattern(normalized)) {
    return `${fieldName} contiene código o etiquetas no permitidas.`;
  }
  if (maxLength !== undefined && normalized.trim().length > maxLength) {
    return `${fieldName} no puede superar los ${maxLength} caracteres.`;
  }
  return null;
}

const PERSON_NAME_ALLOWED = /^[\p{L}\s.\-']{2,180}$/u;

export function validatePersonName(
  value: string,
  fieldName = "El nombre"
): string | null {
  if (typeof value !== "string") return `${fieldName} es obligatorio.`;
  const trimmed = value.normalize("NFC").trim();
  if (trimmed.length < 2) {
    return `${fieldName} debe tener al menos 2 caracteres.`;
  }
  if (trimmed.length > 180) {
    return `${fieldName} no puede superar los 180 caracteres.`;
  }
  if (hasSqlInjectionPattern(trimmed) || hasXssPattern(trimmed)) {
    return `${fieldName} contiene caracteres o expresiones no permitidas (no se permiten patrones de inyección).`;
  }
  if (!PERSON_NAME_ALLOWED.test(trimmed)) {
    return `${fieldName} solo puede contener letras, espacios, puntos, guiones o apóstrofos (sin números ni símbolos especiales).`;
  }
  if (/[-.']{2,}/.test(trimmed)) {
    return `${fieldName} contiene signos de puntuación repetidos no válidos.`;
  }
  if (/^[-.']|[-.']$/.test(trimmed)) {
    return `${fieldName} no puede iniciar ni terminar con guion, apóstrofo o punto.`;
  }
  const letterCount = (trimmed.match(/\p{L}/gu) || []).length;
  if (letterCount < 2) {
    return `${fieldName} debe contener al menos dos letras.`;
  }
  return null;
}

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(value: string): string | null {
  if (typeof value !== "string" || !value.trim()) return "El correo es obligatorio.";
  const trimmed = value.trim();
  if (trimmed.length > 254) return "El correo no puede superar los 254 caracteres.";
  if (!EMAIL_PATTERN.test(trimmed) || trimmed.includes("..")) {
    return "Ingresa un correo electrónico válido.";
  }
  return null;
}
