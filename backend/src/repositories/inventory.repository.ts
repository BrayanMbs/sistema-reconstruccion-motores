import type { QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { CreateInventoryItemDto } from "../dtos/admin.dtos";
import type { InventoryItem, WorkOrderInventory } from "../models/domain";

const mapItem = (row: QueryResultRow): InventoryItem => ({ id: row.id, sku: row.sku, name: row.name, description: row.description, unit: row.unit, stockQuantity: Number(row.stock_quantity), minimumStock: Number(row.minimum_stock), createdAt: row.created_at, updatedAt: row.updated_at });
const mapAllocation = (row: QueryResultRow): WorkOrderInventory => ({ workOrderId: row.work_order_id, inventoryItemId: row.inventory_item_id, sku: row.sku, name: row.name, unit: row.unit, quantity: Number(row.quantity), assignedAt: row.assigned_at });

export class InventoryRepository {
  async list(search?: string) { const result = await databasePool.query(`SELECT * FROM inventory_items ${search ? "WHERE sku ILIKE $1 OR name ILIKE $1" : ""} ORDER BY name`, search ? [`%${search}%`] : []); return result.rows.map(mapItem); }
  async create(input: CreateInventoryItemDto) { const result = await databasePool.query("INSERT INTO inventory_items (sku, name, description, unit, stock_quantity, minimum_stock) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [input.sku, input.name, input.description ?? null, input.unit, input.stockQuantity, input.minimumStock]); return mapItem(result.rows[0]); }
  async allocations(orderId: string) { const result = await databasePool.query("SELECT a.*, i.sku, i.name, i.unit FROM work_order_inventory a JOIN inventory_items i ON i.id = a.inventory_item_id WHERE a.work_order_id = $1 ORDER BY i.name", [orderId]); return result.rows.map(mapAllocation); }
  async allocate(orderId: string, itemId: string, quantity: number, actorId: string) {
    const connection = await databasePool.connect();
    try { await connection.query("BEGIN"); const item = await connection.query("SELECT stock_quantity FROM inventory_items WHERE id = $1 FOR UPDATE", [itemId]); if (!item.rowCount) throw new Error("ITEM_NOT_FOUND"); if (Number(item.rows[0].stock_quantity) < quantity) throw new Error("INSUFFICIENT_STOCK"); await connection.query("UPDATE inventory_items SET stock_quantity = stock_quantity - $2, updated_at = now() WHERE id = $1", [itemId, quantity]); await connection.query("INSERT INTO work_order_inventory (work_order_id, inventory_item_id, quantity, assigned_by) VALUES ($1,$2,$3,$4) ON CONFLICT (work_order_id, inventory_item_id) DO UPDATE SET quantity = work_order_inventory.quantity + EXCLUDED.quantity, assigned_at = now(), assigned_by = EXCLUDED.assigned_by", [orderId, itemId, quantity, actorId]); await connection.query("COMMIT"); }
    catch (error) { await connection.query("ROLLBACK"); throw error; } finally { connection.release(); }
  }
  async release(orderId: string, itemId: string) { const connection = await databasePool.connect(); try { await connection.query("BEGIN"); const allocation = await connection.query("DELETE FROM work_order_inventory WHERE work_order_id = $1 AND inventory_item_id = $2 RETURNING quantity", [orderId, itemId]); if (!allocation.rowCount) return false; await connection.query("UPDATE inventory_items SET stock_quantity = stock_quantity + $2, updated_at = now() WHERE id = $1", [itemId, allocation.rows[0].quantity]); await connection.query("COMMIT"); return true; } catch (error) { await connection.query("ROLLBACK"); throw error; } finally { connection.release(); } }
}
