import { Router } from "express";
import { cashierCreatePayment,cashierDashboard,cashierDailySummary,cashierOrders,cashierPayment,cashierPayments } from "../controllers/cashier.controller";
import { requireAuthentication,requireRole } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { CashSessionRepository } from "../repositories/cash-session.repository";
import { validateMoneyAmount } from "../validators/finance.validators";
import { optionalText, requireText } from "../validators/common.validators";
import { AppError } from "../utils/app-error";
import { CashierRepository } from "../repositories/cashier.repository";
export const cashierRouter=Router();cashierRouter.use(requireAuthentication,requireRole("ADMIN","CASHIER"));cashierRouter.get("/dashboard",asyncHandler(cashierDashboard));cashierRouter.get("/orders",asyncHandler(cashierOrders));cashierRouter.get("/payments",asyncHandler(cashierPayments));cashierRouter.get("/payments/:id",asyncHandler(cashierPayment));cashierRouter.post("/payments",asyncHandler(cashierCreatePayment));cashierRouter.get("/daily-summary",asyncHandler(cashierDailySummary));
const sessions = new CashSessionRepository();
cashierRouter.get("/orders/:id/summary",asyncHandler(async(req,res)=>{
  const id=requireText(req.params.id,"Orden");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AppError("Identificador de orden inválido",422,"VALIDATION_ERROR");
  const order=await new CashierRepository().orderSummary(id);
  if(!order) throw new AppError("Orden de trabajo no encontrada",404,"WORK_ORDER_NOT_FOUND");
  res.json({order});
}));
const cashAmount=(value:unknown,field:string)=>{
  if(typeof value!=="string" && typeof value!=="number") throw new AppError(`${field} debe ser numérico`,422,"VALIDATION_ERROR");
  const amount=validateMoneyAmount(value,field,{allowZero:true});
  if(amount>9999999999.99) throw new AppError(`${field} excede el límite permitido`,422,"VALIDATION_ERROR");
  return amount;
};
cashierRouter.get("/sessions",asyncHandler(async(req,res)=>{ res.json({sessions:await sessions.list(req.appUser!.id)}); }));
cashierRouter.post("/sessions/open",asyncHandler(async(req,res)=>{
  const amount=cashAmount(req.body?.openingAmount,"Monto inicial");
  res.status(201).json(await sessions.change(req.appUser!.id,amount,false));
}));
cashierRouter.post("/sessions/close",asyncHandler(async(req,res)=>{
  const amount=cashAmount(req.body?.countedCash,"Efectivo contado");
  const notes=optionalText(req.body?.notes,"Observaciones",2000);
  res.json(await sessions.change(req.appUser!.id,amount,true,notes,requireText(req.body?.sessionId,"Turno de caja")));
}));
