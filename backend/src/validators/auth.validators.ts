import { AppError } from "../utils/app-error";
import { requireText } from "./common.validators";

export const validateNewPassword = (value: unknown): string => {
  const password = requireText(value, "Nueva contraseña", 128);
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new AppError("La nueva contraseña debe tener al menos 12 caracteres e incluir mayúscula, minúscula, número y símbolo", 422, "WEAK_PASSWORD");
  }
  return password;
};
