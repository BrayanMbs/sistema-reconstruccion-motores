import { apiRequest } from "@/shared/services/api";
import type { ItemFilters, ItemPayload, MovementFilters, MovementPayload } from "../dtos/inventory.dto";
import type { InventoryDashboard, InventoryItem, MovementPage, PaginatedInventory } from "../models/inventory";

const query = (values: Record<string, string | number | undefined>) => { const params = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); }); const serialized = params.toString(); return serialized ? `?${serialized}` : ""; };
export const inventoryService = {
  dashboard: async () => (await apiRequest<{ dashboard: InventoryDashboard }>("/api/inventory/dashboard")).dashboard,
  activeWorkOrders: async () => (await apiRequest<{ items: { id: string; code: string }[] }>("/api/inventory/work-orders")).items,
  list: async (filters: ItemFilters = {}) => apiRequest<PaginatedInventory<InventoryItem>>(`/api/inventory/items${query(filters)}`),
  get: async (id: string) => (await apiRequest<{ item: InventoryItem }>(`/api/inventory/items/${id}`)).item,
  create: async (input: ItemPayload) => (await apiRequest<{ item: InventoryItem }>("/api/inventory/items", { method: "POST", body: JSON.stringify(input) })).item,
  update: async (id: string, input: ItemPayload) => (await apiRequest<{ item: InventoryItem }>(`/api/inventory/items/${id}`, { method: "PATCH", body: JSON.stringify(input) })).item,
  status: async (id: string, isActive: boolean) => (await apiRequest<{ item: InventoryItem }>(`/api/inventory/items/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) })).item,
  entry: async (id: string, input: MovementPayload) => apiRequest(`/api/inventory/items/${id}/entries`, { method: "POST", body: JSON.stringify(input) }),
  exit: async (id: string, input: MovementPayload) => apiRequest(`/api/inventory/items/${id}/exits`, { method: "POST", body: JSON.stringify(input) }),
  movements: async (filters: MovementFilters = {}) => apiRequest<MovementPage>(`/api/inventory/movements${query(filters)}`)
};
