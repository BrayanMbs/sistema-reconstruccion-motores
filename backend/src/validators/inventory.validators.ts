import type { CreateInventoryItemInput, InventoryMovementFilters, InventoryMovementInput, InventoryListFilters, UpdateInventoryItemInput } from "../dtos/inventory.dtos";
import type { InventoryItemType, InventoryMovementType } from "../models/domain";
import { AppError } from "../utils/app-error";
import { limitFromQuery, optionalDate, optionalText, pageFromQuery, requireText } from "./common.validators";

const itemTypes = ["PART", "MATERIAL", "TOOL", "CONSUMABLE"] as const;
const movementTypes = ["ENTRY", "EXIT", "ADJUSTMENT"] as const;
const entryReasons = ["Compra a proveedor", "Devolución de material", "Ajuste autorizado", "Reposición", "Existencia inicial", "Otro"];
const exitReasons = ["Uso en reparación", "Herramienta entregada", "Producto dañado", "Ajuste autorizado", "Devolución a proveedor", "Otro"];

const enumValue = <T extends readonly string[]>(value: unknown, values: T, field: string): T[number] => {
  if (typeof value !== "string" || !values.includes(value)) throw new AppError(`${field} no es válido`, 422, "VALIDATION_ERROR");
  return value as T[number];
};
const nonNegativeAmount = (value: unknown, field: string): number => {
  if (value === null || value === undefined || value === "") throw new AppError(`${field} es obligatorio`, 422, "VALIDATION_ERROR");
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || Math.round(parsed * 100) !== parsed * 100) throw new AppError(`${field} debe ser un número válido mayor o igual a cero con máximo 2 decimales`, 422, "VALIDATION_ERROR");
  return parsed;
};
const positiveAmount = (value: unknown, field: string): number => {
  const parsed = nonNegativeAmount(value, field);
  if (parsed <= 0) throw new AppError(`${field} debe ser mayor que cero`, 422, "VALIDATION_ERROR");
  return parsed;
};
const optionalBoolean = (value: unknown, fallback: boolean): boolean => value === undefined ? fallback : value === true || value === "true";

export const validateCreateInventoryItem = (body: Record<string, unknown>): CreateInventoryItemInput => ({
  code: requireText(body.code ?? body.sku, "Código", 80), name: requireText(body.name, "Nombre", 180),
  type: enumValue(body.type ?? "PART", itemTypes, "Tipo") as InventoryItemType,
  category: requireText(body.category ?? "Otros", "Categoría", 100), brand: optionalText(body.brand, "Marca", 120),
  partNumber: optionalText(body.partNumber, "Número de parte", 120), description: optionalText(body.description, "Descripción", 2000),
  compatibility: optionalText(body.compatibility, "Compatibilidad", 2000), unit: requireText(body.unit, "Unidad", 40),
  location: optionalText(body.location, "Ubicación", 180), minimumStock: nonNegativeAmount(body.minimumStock ?? 0, "Stock mínimo"),
  initialStock: nonNegativeAmount(body.initialStock ?? body.stockQuantity ?? 0, "Existencia inicial"),
  referenceUnitCost: nonNegativeAmount(body.referenceUnitCost ?? 0, "Costo unitario de referencia"),
  referenceSupplier: optionalText(body.referenceSupplier, "Proveedor de referencia", 180), isActive: optionalBoolean(body.isActive, true)
});
export const validateUpdateInventoryItem = (body: Record<string, unknown>): UpdateInventoryItemInput => {
  if ("currentStock" in body || "stockQuantity" in body || "initialStock" in body) throw new AppError("La existencia actual solo puede modificarse mediante movimientos de inventario", 422, "STOCK_DIRECT_UPDATE_FORBIDDEN");
  const base = validateCreateInventoryItem({ ...body, code: "INMUTABLE-CODE", initialStock: 0 });
  return { name: base.name, type: base.type, category: base.category, brand: base.brand, partNumber: base.partNumber, description: base.description, compatibility: base.compatibility, unit: base.unit, location: base.location, minimumStock: base.minimumStock, referenceUnitCost: base.referenceUnitCost, referenceSupplier: base.referenceSupplier, isActive: base.isActive };
};
export const validateMovement = (body: Record<string, unknown>, kind: "ENTRY" | "EXIT"): InventoryMovementInput => {
  const reason = requireText(body.reason, "Motivo", 120);
  if (!(kind === "ENTRY" ? entryReasons : exitReasons).includes(reason)) throw new AppError("Motivo de movimiento no válido", 422, "VALIDATION_ERROR");
  const workOrderId = optionalText(body.workOrderId, "Orden relacionada", 80);
  if (kind === "EXIT" && reason === "Uso en reparación" && !workOrderId) throw new AppError("La orden relacionada es obligatoria para uso en reparación", 422, "WORK_ORDER_REQUIRED");
  return { quantity: positiveAmount(body.quantity, "Cantidad"), reason, referenceDocument: optionalText(body.referenceDocument, "Factura o referencia", 180), supplierReference: optionalText(body.supplierReference, "Proveedor", 180), workOrderId, observation: optionalText(body.observation, "Observación", 2000) };
};
export const validateStatus = (body: Record<string, unknown>): boolean => {
  if (typeof body.isActive !== "boolean") throw new AppError("El estado es obligatorio", 422, "VALIDATION_ERROR");
  return body.isActive;
};
export const inventoryListFilters = (query: Record<string, unknown>): InventoryListFilters => ({
  search: optionalText(query.search, "Búsqueda", 180) ?? undefined,
  type: query.type ? enumValue(query.type, itemTypes, "Tipo") as InventoryItemType : undefined,
  category: optionalText(query.category, "Categoría", 100) ?? undefined,
  status: query.status ? enumValue(query.status, ["ACTIVE", "INACTIVE", "LOW", "OUT"] as const, "Estado") : undefined,
  page: pageFromQuery(query.page), limit: limitFromQuery(query.limit)
});
export const inventoryMovementFilters = (query: Record<string, unknown>): InventoryMovementFilters => ({
  itemId: optionalText(query.itemId, "Producto", 80) ?? undefined,
  movementType: query.movementType ? enumValue(query.movementType, movementTypes, "Tipo") as InventoryMovementType : undefined,
  responsibleUserId: optionalText(query.responsibleUserId, "Responsable", 80) ?? undefined,
  reason: optionalText(query.reason, "Motivo", 120) ?? undefined, startDate: optionalDate(query.startDate, "Fecha inicial") ?? undefined,
  endDate: optionalDate(query.endDate, "Fecha final") ?? undefined, workOrderId: optionalText(query.workOrderId, "Orden", 80) ?? undefined,
  page: pageFromQuery(query.page), limit: limitFromQuery(query.limit)
});
