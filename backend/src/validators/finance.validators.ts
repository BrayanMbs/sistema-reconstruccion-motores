import { AppError } from "../utils/app-error";
import { optionalText, requireText } from "./common.validators";
import type { CreatePaymentDto, UpdateOrderFinanceDto } from "../dtos/finance.dtos";

export const validateMoneyAmount = (
  value: unknown,
  field: string,
  options: { allowZero?: boolean } = {}
): number => {
  if (value === null || value === undefined || value === "") {
    throw new AppError(`${field} es obligatorio`, 422, "VALIDATION_ERROR");
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (typeof value === "string" && !/^-?\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new AppError(`${field} debe tener un formato numérico válido con un máximo de 2 decimales`, 422, "VALIDATION_ERROR");
  }

  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new AppError(`${field} debe ser un número válido`, 422, "VALIDATION_ERROR");
  }

  const rounded = Number(parsed.toFixed(2));
  if (Math.abs(parsed - rounded) > 0.0001) {
    throw new AppError(`${field} no puede tener más de 2 decimales`, 422, "VALIDATION_ERROR");
  }

  if (options.allowZero) {
    if (rounded < 0) {
      throw new AppError(`${field} debe ser mayor o igual a cero`, 422, "VALIDATION_ERROR");
    }
  } else {
    if (rounded <= 0) {
      throw new AppError(`${field} debe ser un número mayor que cero`, 422, "VALIDATION_ERROR");
    }
  }

  return rounded;
};

export const validatePaymentInput = (body: unknown): CreatePaymentDto => {
  if (!body || typeof body !== "object") {
    throw new AppError("Datos de pago inválidos", 422, "VALIDATION_ERROR");
  }

  const data = body as Record<string, unknown>;
  const workOrderId = requireText(data.workOrderId, "Orden de trabajo", 120);
  const amount = validateMoneyAmount(data.amount, "Monto del pago", { allowZero: false });
  const method = requireText(data.method, "Método de pago", 40);
  const reference = optionalText(data.reference, "Referencia", 120);
  const notes = optionalText(data.notes, "Notas", 2000);

  if (method.trim().toLowerCase() === "transferencia" && (!reference || reference.trim().length === 0)) {
    throw new AppError(
      "La referencia bancaria es obligatoria para pagos por transferencia",
      422,
      "TRANSFER_REFERENCE_REQUIRED"
    );
  }

  return {
    workOrderId,
    amount,
    method: method.trim(),
    reference: reference?.trim() ?? null,
    notes: notes?.trim() ?? null
  };
};

export const validateUpdateOrderFinance = (body: unknown): UpdateOrderFinanceDto => {
  if (!body || typeof body !== "object") {
    throw new AppError("Datos financieros inválidos", 422, "VALIDATION_ERROR");
  }

  const data = body as Record<string, unknown>;
  const totalAmount = validateMoneyAmount(data.totalAmount, "Monto total aprobado", { allowZero: true });

  return { totalAmount };
};
