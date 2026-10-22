export const GUATEMALA_PHONE_PREFIX = "+502";

export const localPhoneDigits = (phone: string | null | undefined): string => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.startsWith("502") ? digits.slice(3, 11) : digits.slice(0, 8);
};

export const normalizeGuatemalaPhone = (localDigits: string): string =>
  localDigits ? `${GUATEMALA_PHONE_PREFIX}${localDigits}` : "";

export const validateGuatemalaPhone = (localDigits: string): string | null => {
  if (!localDigits) return null;
  return /^\d{8}$/.test(localDigits) ? null : "El telefono debe tener exactamente 8 digitos.";
};
