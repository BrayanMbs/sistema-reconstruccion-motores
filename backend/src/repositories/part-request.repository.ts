import { databasePool } from "../config/database";
import { AppError } from "../utils/app-error";
import { AuditService } from "../services/audit.service";

const select = `SELECT r.id,r.work_order_id AS "orderId",o.code AS "orderCode",c.full_name AS "clientName",i.name AS "itemName",i.sku,i.unit,r.quantity::float8 AS quantity,r.reason,r.status,
 r.approved_unit_price::float8 AS "approvedUnitPrice",r.charge_amount::float8 AS "chargeAmount",
 r.created_at AS "createdAt",r.review_note AS "reviewNote",r.reviewed_at AS "reviewedAt",
 requester.full_name AS "requestedBy",reviewer.full_name AS "reviewedBy",
 i.stock_quantity::float8 AS "availableStock",i.reference_unit_cost::float8 AS "originalUnitCost",o.total_amount::float8 AS "orderTotal"
 FROM part_requests r JOIN work_orders o ON o.id=r.work_order_id JOIN clients c ON c.id=o.client_id
 JOIN inventory_items i ON i.id=r.inventory_item_id JOIN app_users requester ON requester.id=r.requested_by
 LEFT JOIN app_users reviewer ON reviewer.id=r.reviewed_by`;

export class PartRequestRepository {
  async list(orderId?:string,workerId?:string) {
    if(workerId){
      const owned=await databasePool.query("SELECT id FROM work_orders WHERE id=$1 AND assigned_worker_id=$2",[orderId,workerId]);
      if(!owned.rowCount) throw new AppError("No tienes acceso a esta orden",403,"ORDER_NOT_OWNED");
    }
    const result=await databasePool.query(`${select} ${orderId?"WHERE r.work_order_id=$1":""} ORDER BY (r.status='PENDING') DESC,r.created_at DESC LIMIT 200`,orderId?[orderId]:[]);
    return workerId ? result.rows.map(row=>{const copy={...row};delete copy.originalUnitCost;return copy;}) : result.rows;
  }
  async catalog(search:string) {
    const result=await databasePool.query(`SELECT id,name,sku,unit,stock_quantity::float8 AS stock FROM inventory_items
      WHERE is_active AND item_type IN ('PART','MATERIAL','CONSUMABLE') AND (name ILIKE $1 OR sku ILIKE $1)
      ORDER BY name LIMIT 100`,[`%${search}%`]);
    return result.rows;
  }
  async request(actorId:string,input:{orderId:string;itemId:string;quantity:number;reason:string}) {
    const client=await databasePool.connect();
    try {
      await client.query("BEGIN");
      const order=await client.query("SELECT assigned_worker_id,status FROM work_orders WHERE id=$1 FOR UPDATE",[input.orderId]);
      if(order.rows[0]?.assigned_worker_id!==actorId) throw new AppError("Solo puedes solicitar repuestos de tus órdenes asignadas",403,"ORDER_NOT_OWNED");
      if(!['PENDING','IN_PROGRESS'].includes(order.rows[0].status)) throw new AppError("Esta orden ya no admite solicitudes",409,"ORDER_NOT_ACTIVE");
      const item=await client.query("SELECT id FROM inventory_items WHERE id=$1 AND is_active AND item_type IN ('PART','MATERIAL','CONSUMABLE')",[input.itemId]);
      if(!item.rowCount) throw new AppError("Repuesto no disponible en el catálogo",422,"ITEM_NOT_AVAILABLE");
      const result=await client.query("INSERT INTO part_requests(work_order_id,inventory_item_id,requested_by,quantity,reason) VALUES($1,$2,$3,$4,$5) RETURNING id",[input.orderId,input.itemId,actorId,input.quantity,input.reason]);
      await new AuditService().record(actorId,"PART_REQUESTED","WORK_ORDER",input.orderId,{requestId:result.rows[0].id,itemId:input.itemId,quantity:input.quantity},client);
      await client.query("COMMIT");return result.rows[0];
    }catch(error){await client.query("ROLLBACK");if((error as {code?:string}).code==='23505')throw new AppError("Ya hay una solicitud pendiente para este repuesto en la orden",409,"DUPLICATE_PART_REQUEST");throw error;}finally{client.release();}
  }
  async review(actorId:string,id:string,decision:'APPROVED'|'REJECTED',price:number|null,note:string|null) {
    const client=await databasePool.connect();
    try {
      await client.query("BEGIN");
      const request=await client.query("SELECT * FROM part_requests WHERE id=$1 FOR UPDATE",[id]);
      const r=request.rows[0];
      if(!r) throw new AppError("Solicitud no encontrada",404,"PART_REQUEST_NOT_FOUND");
      if(r.status!=='PENDING') throw new AppError("La solicitud ya fue revisada",409,"PART_REQUEST_REVIEWED");
      let charge:number|null=null;
      if(decision==='APPROVED') {
        const order=await client.query("SELECT status,total_amount FROM work_orders WHERE id=$1 FOR UPDATE",[r.work_order_id]);
        if(!['PENDING','IN_PROGRESS'].includes(order.rows[0]?.status)) throw new AppError("La orden ya no está activa",409,"ORDER_NOT_ACTIVE");
        if(order.rows[0].total_amount===null) throw new AppError("Define la cotización de la orden antes de aprobar el repuesto",409,"ORDER_QUOTE_REQUIRED");
        const stock=await client.query("SELECT stock_quantity,is_active FROM inventory_items WHERE id=$1 FOR UPDATE",[r.inventory_item_id]);
        const item=stock.rows[0];
        if(!item?.is_active||Number(item.stock_quantity)<Number(r.quantity)) throw new AppError("No hay existencia suficiente para aprobar la solicitud",409,"INSUFFICIENT_STOCK");
        charge=Number((Number(r.quantity)*price!).toFixed(2));
        if(!Number.isFinite(charge)||charge>9999999999.99||Number(order.rows[0].total_amount)+charge>9999999999.99) throw new AppError("El cargo excede el límite permitido",422,"CHARGE_LIMIT");
        await client.query("UPDATE inventory_items SET stock_quantity=stock_quantity-$2,updated_by=$3,updated_at=now() WHERE id=$1",[r.inventory_item_id,r.quantity,actorId]);
        await client.query(`INSERT INTO inventory_movements(inventory_item_id,movement_type,quantity,previous_stock,resulting_stock,reason,work_order_id,observation,performed_by)
          VALUES($1,'EXIT',$2,$3,$3::numeric-$2::numeric,'Solicitud de repuesto aprobada',$4,$5,$6)`,[r.inventory_item_id,r.quantity,item.stock_quantity,r.work_order_id,`Solicitud ${id}`,actorId]);
        await client.query("UPDATE work_orders SET total_amount=total_amount+$2 WHERE id=$1",[r.work_order_id,charge]);
      }
      await client.query("UPDATE part_requests SET status=$2,approved_unit_price=$3,charge_amount=$4,reviewed_by=$5,review_note=$6,reviewed_at=now() WHERE id=$1",[id,decision,price,charge,actorId,note]);
      await new AuditService().record(actorId,`PART_REQUEST_${decision}`,"WORK_ORDER",r.work_order_id,{requestId:id,quantity:Number(r.quantity),unitPrice:price,chargeAmount:charge,note},client);
      await client.query("COMMIT");return {id,status:decision,chargeAmount:charge};
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
}
