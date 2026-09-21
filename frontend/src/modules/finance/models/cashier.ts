import type { FinancialStatus, Payment, WorkOrderStatus } from "@/shared/models/admin";
export type CashierOrder={workOrderId:string;workOrderCode:string;clientName:string;totalAmount:number|null;totalPaid:number;balance:number|null;financialStatus:FinancialStatus;operationalStatus:WorkOrderStatus;createdAt:string};
export type CashierSummary={businessDate:string;cashierName:string|null;paymentCount:number;totalAmount:number;cashAmount:number;transferAmount:number;otherAmount:number;paidOrders:number;pendingOrders:number;partialPayments:number;finalPayments:number};
export type CashierDashboard=Omit<CashierSummary,"pendingOrders">&{recentPayments:Payment[];pendingOrders:CashierOrder[]};
export const statusLabel:Record<FinancialStatus,string>={PENDING:"Pendiente",PARTIAL:"Pago parcial",PAID:"Pagado"};
