import { Router } from "express";
import { requireAuthentication,requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { requireText,optionalText } from "../validators/common.validators";
import { validateMoneyAmount } from "../validators/finance.validators";
import { AppError } from "../utils/app-error";
import { PartRequestRepository } from "../repositories/part-request.repository";

const uuid=(value:unknown)=>{
 const id=requireText(value,"Identificador",36);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new AppError("Identificador inválido",422,"VALIDATION_ERROR");
 return id;
};
const amount=(value:unknown,field:string,allowZero=false)=>{
 if(typeof value!=='string'&&typeof value!=='number')throw new AppError(`${field} debe ser numérico`,422,"VALIDATION_ERROR");
 const number=validateMoneyAmount(value,field,{allowZero});
 if(number>9999999999.99)throw new AppError(`${field} excede el límite`,422,"VALIDATION_ERROR");
 return number;
};
const quantity=(value:unknown)=>{
 const number=amount(value,"Cantidad");
 if(!Number.isInteger(number))throw new AppError("La cantidad debe ser un número entero",422,"VALIDATION_ERROR");
 return number;
};
const repository=new PartRequestRepository();
export const partRequestRouter=Router();
partRequestRouter.use(requireAuthentication,requireRole("OPERATOR","ADMIN","INVENTORY"));
partRequestRouter.get("/catalog",asyncHandler(async(req,res)=>{
 res.json({items:await repository.catalog(optionalText(req.query.search,"Búsqueda",100)??"")});
}));
partRequestRouter.get("/",asyncHandler(async(req,res)=>{
 const operator=req.appUser!.role==='OPERATOR';
 const orderId=req.query.orderId?uuid(req.query.orderId):undefined;
 if(operator&&!orderId)throw new AppError("Debes indicar tu orden asignada",422,"ORDER_REQUIRED");
 res.json({items:await repository.list(orderId,operator?req.appUser!.id:undefined)});
}));
partRequestRouter.post("/",requireRole("OPERATOR"),asyncHandler(async(req,res)=>{
 const input={orderId:uuid(req.body?.orderId),itemId:uuid(req.body?.itemId),quantity:quantity(req.body?.quantity),reason:requireText(req.body?.reason,"Motivo",2000)};
 res.status(201).json(await repository.request(req.appUser!.id,input));
}));
partRequestRouter.post("/:id/review",requireRole("ADMIN","INVENTORY"),asyncHandler(async(req,res)=>{
 const id=uuid(req.params.id);
 const decision=req.body?.decision;
 if(decision!=='APPROVED'&&decision!=='REJECTED')throw new AppError("Decisión inválida",422,"VALIDATION_ERROR");
 const note=optionalText(req.body?.note,"Observación",2000);
 if(decision==='REJECTED'&&!note)throw new AppError("Indica el motivo del rechazo",422,"REJECTION_REASON_REQUIRED");
 res.json(await repository.review(req.appUser!.id,id,decision,decision==='APPROVED'?amount(req.body?.unitPrice,"Precio unitario de venta",true):null,note));
}));
