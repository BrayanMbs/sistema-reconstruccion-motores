import type { PoolClient, QueryResultRow } from "pg";
import { databasePool } from "../config/database";
import type { CreateInventoryItemInput, InventoryListFilters, InventoryMovementFilters, InventoryMovementInput, UpdateInventoryItemInput } from "../dtos/inventory.dtos";
import type { InventoryDashboard, InventoryItem, InventoryMovement, WorkOrderInventory } from "../models/domain";

const mapItem = (row: QueryResultRow): InventoryItem => ({ id: row.id, sku: row.sku, name: row.name, description: row.description, unit: row.unit, stockQuantity: Number(row.stock_quantity), minimumStock: Number(row.minimum_stock), type: row.item_type, category: row.category, brand: row.brand, partNumber: row.part_number, compatibility: row.compatibility, location: row.location, referenceUnitCost: Number(row.reference_unit_cost), referenceSupplier: row.reference_supplier, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by, updatedBy: row.updated_by, updatedByName: row.updated_by_name ?? null, lastMovementAt: row.last_movement_at ?? null });
const mapMovement = (row: QueryResultRow): InventoryMovement => ({ id: row.id, inventoryItemId: row.inventory_item_id, itemCode: row.item_code, itemName: row.item_name, movementType: row.movement_type, quantity: Number(row.quantity), previousStock: Number(row.previous_stock), resultingStock: Number(row.resulting_stock), reason: row.reason, referenceDocument: row.reference_document, supplierReference: row.supplier_reference, workOrderId: row.work_order_id, workOrderCode: row.work_order_code, observation: row.observation, performedBy: row.performed_by, performedByName: row.performed_by_name ?? null, createdAt: row.created_at });
const mapAllocation = (row: QueryResultRow): WorkOrderInventory => ({ workOrderId: row.work_order_id, inventoryItemId: row.inventory_item_id, sku: row.sku, name: row.name, unit: row.unit, quantity: Number(row.quantity), assignedAt: row.assigned_at });
const itemSelect = `SELECT i.*, updater.full_name AS updated_by_name, last_movement.created_at AS last_movement_at FROM inventory_items i LEFT JOIN app_users updater ON updater.id = i.updated_by LEFT JOIN LATERAL (SELECT created_at FROM inventory_movements WHERE inventory_item_id = i.id ORDER BY created_at DESC LIMIT 1) last_movement ON true`;
const movementSelect = `SELECT m.*, i.sku AS item_code, i.name AS item_name, u.full_name AS performed_by_name, o.code AS work_order_code FROM inventory_movements m JOIN inventory_items i ON i.id = m.inventory_item_id LEFT JOIN app_users u ON u.id = m.performed_by LEFT JOIN work_orders o ON o.id = m.work_order_id`;

export class InventoryRepository {
  async list(filters: InventoryListFilters) {
    const clauses: string[] = []; const params: unknown[] = [];
    if (filters.search) { params.push(`%${filters.search}%`); clauses.push(`(i.sku ILIKE $${params.length} OR i.name ILIKE $${params.length})`); }
    if (filters.type) { params.push(filters.type); clauses.push(`i.item_type = $${params.length}`); } if (filters.category) { params.push(filters.category); clauses.push(`i.category = $${params.length}`); }
    if (filters.status === "ACTIVE") clauses.push("i.is_active = true"); if (filters.status === "INACTIVE") clauses.push("i.is_active = false"); if (filters.status === "LOW") clauses.push("i.is_active = true AND i.stock_quantity > 0 AND i.stock_quantity <= i.minimum_stock"); if (filters.status === "OUT") clauses.push("i.is_active = true AND i.stock_quantity <= 0");
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""; const total = await databasePool.query(`SELECT count(*)::int AS count FROM inventory_items i ${where}`, params);
    params.push(filters.limit, (filters.page - 1) * filters.limit); const result = await databasePool.query(`${itemSelect} ${where} ORDER BY i.name LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: result.rows.map(mapItem), total: total.rows[0].count, page: filters.page, limit: filters.limit };
  }
  async findById(id: string): Promise<InventoryItem | null> { const result = await databasePool.query(`${itemSelect} WHERE i.id = $1`, [id]); return result.rowCount ? mapItem(result.rows[0]) : null; }
  async create(input: CreateInventoryItemInput, actorId: string): Promise<InventoryItem> {
    const client = await databasePool.connect(); try { await client.query("BEGIN"); const result = await client.query(`INSERT INTO inventory_items (sku,name,item_type,category,brand,part_number,description,compatibility,unit,location,minimum_stock,stock_quantity,reference_unit_cost,reference_supplier,is_active,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16) RETURNING *`, [input.code,input.name,input.type,input.category,input.brand,input.partNumber,input.description,input.compatibility,input.unit,input.location,input.minimumStock,input.initialStock,input.referenceUnitCost,input.referenceSupplier,input.isActive,actorId]); const item = result.rows[0]; if (input.initialStock > 0) await this.insertMovement(client, { itemId:item.id,type:"ENTRY",quantity:input.initialStock,previousStock:0,resultingStock:input.initialStock,reason:"Existencia inicial",actorId,referenceDocument:null,supplierReference:null,workOrderId:null,observation:"Existencia inicial registrada al crear el producto" }); await client.query("COMMIT"); return { ...mapItem(item), updatedByName:null, lastMovementAt: input.initialStock > 0 ? new Date().toISOString() : null }; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async update(id: string, input: UpdateInventoryItemInput, actorId: string): Promise<InventoryItem | null> { const result = await databasePool.query(`UPDATE inventory_items SET name=$2,item_type=$3,category=$4,brand=$5,part_number=$6,description=$7,compatibility=$8,unit=$9,location=$10,minimum_stock=$11,reference_unit_cost=$12,reference_supplier=$13,is_active=$14,updated_by=$15,updated_at=now() WHERE id=$1 RETURNING *`, [id,input.name,input.type,input.category,input.brand,input.partNumber,input.description,input.compatibility,input.unit,input.location,input.minimumStock,input.referenceUnitCost,input.referenceSupplier,input.isActive,actorId]); return result.rowCount ? { ...mapItem(result.rows[0]), updatedByName:null,lastMovementAt:null } : null; }
  async setStatus(id: string, isActive: boolean, actorId: string): Promise<InventoryItem | null> { const result = await databasePool.query("UPDATE inventory_items SET is_active=$2,updated_by=$3,updated_at=now() WHERE id=$1 RETURNING *", [id,isActive,actorId]); return result.rowCount ? { ...mapItem(result.rows[0]),updatedByName:null,lastMovementAt:null } : null; }
  async createMovement(itemId: string, type: "ENTRY" | "EXIT", input: InventoryMovementInput, actorId: string): Promise<InventoryMovement> {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      const movement = await this.createMovementInTransaction(client, itemId, type, input, actorId);
      await client.query("COMMIT");
      return movement;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  private async createMovementInTransaction(client: PoolClient, itemId: string, type: "ENTRY" | "EXIT", input: InventoryMovementInput, actorId: string): Promise<InventoryMovement> {
    const locked = await client.query("SELECT id,sku,name,stock_quantity,is_active FROM inventory_items WHERE id=$1 FOR UPDATE", [itemId]);
    if (!locked.rowCount) throw new Error("ITEM_NOT_FOUND");
    const item = locked.rows[0];
    if (!item.is_active) throw new Error("ITEM_INACTIVE");
    if (type === "EXIT" && Number(item.stock_quantity) < input.quantity) {
      throw Object.assign(new Error("INSUFFICIENT_STOCK"), { availableStock: Number(item.stock_quantity) });
    }
    if (type === "EXIT" && input.reason === "Uso en reparación") {
      const order = await client.query("SELECT id FROM work_orders WHERE id=$1 AND status IN ('PENDING','IN_PROGRESS')", [input.workOrderId]);
      if (!order.rowCount) throw new Error("WORK_ORDER_NOT_ACTIVE");
    }
    const previousStock = Number(item.stock_quantity);
    const resultingStock = type === "ENTRY" ? previousStock + input.quantity : previousStock - input.quantity;
    await client.query("UPDATE inventory_items SET stock_quantity=$2,updated_by=$3,updated_at=now() WHERE id=$1", [itemId, resultingStock, actorId]);
    const movement = await this.insertMovement(client, { itemId, type, quantity: input.quantity, previousStock, resultingStock, reason: input.reason, actorId, referenceDocument: input.referenceDocument, supplierReference: input.supplierReference, workOrderId: input.workOrderId, observation: input.observation });
    return { ...movement, itemCode: item.sku, itemName: item.name, performedByName: null, workOrderCode: null };
  }
  private async insertMovement(client: PoolClient, input: { itemId:string; type:"ENTRY"|"EXIT"|"ADJUSTMENT"; quantity:number; previousStock:number; resultingStock:number; reason:string; actorId:string; referenceDocument:string|null; supplierReference:string|null; workOrderId:string|null; observation:string|null }): Promise<InventoryMovement> { const result=await client.query("INSERT INTO inventory_movements (inventory_item_id,movement_type,quantity,previous_stock,resulting_stock,reason,reference_document,supplier_reference,work_order_id,observation,performed_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",[input.itemId,input.type,input.quantity,input.previousStock,input.resultingStock,input.reason,input.referenceDocument,input.supplierReference,input.workOrderId,input.observation,input.actorId]); return mapMovement({...result.rows[0],item_code:"",item_name:"",performed_by_name:null,work_order_code:null}); }
  async movements(filters: InventoryMovementFilters) { const clauses:string[]=[]; const params:unknown[]=[]; const add=(x:string,v:unknown)=>{params.push(v);clauses.push(x.replace("?",`$${params.length}`));}; if(filters.itemId)add("m.inventory_item_id = ?",filters.itemId);if(filters.movementType)add("m.movement_type = ?",filters.movementType);if(filters.responsibleUserId)add("m.performed_by = ?",filters.responsibleUserId);if(filters.reason)add("m.reason ILIKE ?",`%${filters.reason}%`);if(filters.startDate)add("m.created_at >= ?::date",filters.startDate);if(filters.endDate)add("m.created_at < (?::date + interval '1 day')",filters.endDate);if(filters.workOrderId)add("m.work_order_id = ?",filters.workOrderId); const where=clauses.length?`WHERE ${clauses.join(" AND ")}`:"";const total=await databasePool.query(`SELECT count(*)::int AS count,COALESCE(sum(quantity),0)::numeric AS units FROM inventory_movements m ${where}`,params);const kpis=await databasePool.query(`SELECT count(*) FILTER (WHERE movement_type='ENTRY')::int AS entries,count(*) FILTER (WHERE movement_type='EXIT')::int AS exits FROM inventory_movements m ${where}`,params);params.push(filters.limit,(filters.page-1)*filters.limit);const rows=await databasePool.query(`${movementSelect} ${where} ORDER BY m.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);return {items:rows.rows.map(mapMovement),total:total.rows[0].count,page:filters.page,limit:filters.limit,kpis:{total:total.rows[0].count,entries:kpis.rows[0].entries,exits:kpis.rows[0].exits,unitsMoved:Number(total.rows[0].units)}}; }
  async dashboard(): Promise<InventoryDashboard> { const [summary,flow,recent,low]=await Promise.all([databasePool.query("SELECT count(*)::int AS products,COALESCE(sum(stock_quantity),0)::numeric AS stock,count(*) FILTER (WHERE is_active AND stock_quantity <= minimum_stock)::int AS low FROM inventory_items"),databasePool.query("SELECT COALESCE(sum(quantity) FILTER (WHERE movement_type='ENTRY'),0)::numeric AS entries,COALESCE(sum(quantity) FILTER (WHERE movement_type='EXIT'),0)::numeric AS exits FROM inventory_movements WHERE created_at >= date_trunc('month',now())"),databasePool.query(`${movementSelect} ORDER BY m.created_at DESC LIMIT 6`),databasePool.query(`${itemSelect} WHERE i.is_active AND i.stock_quantity <= i.minimum_stock ORDER BY i.stock_quantity ASC,i.name LIMIT 6`)]);const lowCount=summary.rows[0].low;return {productsRegistered:summary.rows[0].products,totalStock:Number(summary.rows[0].stock),lowStockProducts:lowCount,entriesThisMonth:Number(flow.rows[0].entries),exitsThisMonth:Number(flow.rows[0].exits),monthlyFlow:{entries:Number(flow.rows[0].entries),exits:Number(flow.rows[0].exits)},recentMovements:recent.rows.map(mapMovement),lowStockItems:low.rows.map(mapItem),health:lowCount===0?"HEALTHY":lowCount>=5?"CRITICAL":"ATTENTION"}; }
  async activeWorkOrders() { const result = await databasePool.query("SELECT id, code FROM work_orders WHERE status IN ('PENDING','IN_PROGRESS') ORDER BY created_at DESC LIMIT 100"); return result.rows.map((row) => ({ id: String(row.id), code: String(row.code) })); }
  async allocations(orderId:string) { const result=await databasePool.query("SELECT a.*,i.sku,i.name,i.unit FROM work_order_inventory a JOIN inventory_items i ON i.id=a.inventory_item_id WHERE a.work_order_id=$1 ORDER BY i.name",[orderId]);return result.rows.map(mapAllocation); }
  async allocate(orderId: string, itemId: string, quantity: number, actorId: string) {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      await this.createMovementInTransaction(client, itemId, "EXIT", { quantity, reason: "Uso en reparación", referenceDocument: null, supplierReference: null, workOrderId: orderId, observation: "Asignación desde orden de trabajo" }, actorId);
      await client.query("INSERT INTO work_order_inventory (work_order_id,inventory_item_id,quantity,assigned_by) VALUES ($1,$2,$3,$4) ON CONFLICT (work_order_id,inventory_item_id) DO UPDATE SET quantity=work_order_inventory.quantity+EXCLUDED.quantity,assigned_at=now(),assigned_by=EXCLUDED.assigned_by", [orderId, itemId, quantity, actorId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async release(orderId: string, itemId: string, actorId: string) {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      const allocation = await client.query("DELETE FROM work_order_inventory WHERE work_order_id=$1 AND inventory_item_id=$2 RETURNING quantity", [orderId, itemId]);
      if (!allocation.rowCount) {
        await client.query("ROLLBACK");
        return false;
      }
      await this.createMovementInTransaction(client, itemId, "ENTRY", { quantity: Number(allocation.rows[0].quantity), reason: "Devolución de material", referenceDocument: null, supplierReference: null, workOrderId: orderId, observation: "Devolución de asignación de orden" }, actorId);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
