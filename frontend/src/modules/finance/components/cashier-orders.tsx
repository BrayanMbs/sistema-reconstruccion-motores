"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/shared/components/icon";
import { StatusBadge } from "@/shared/components/status-badge";
import { apiRequest } from "@/shared/services/api";
import { cashierService } from "../services/cashier.service";
import type { CashierOrder, CashierOrderDetail } from "../models/cashier";

const money=(value:number)=>new Intl.NumberFormat("es-GT",{style:"currency",currency:"GTQ"}).format(value);
const date=(value:string)=>new Intl.DateTimeFormat("es-GT",{dateStyle:"medium",timeZone:"America/Guatemala"}).format(new Date(value));
const canPay=(order:CashierOrder)=>order.totalAmount!==null&&order.balance!==null&&order.balance>0;

function FinancialBadge({order}:{order:CashierOrder}) {
  const label=order.totalAmount===null?"Sin cotización":order.financialStatus==="PAID"?"Pagado":order.financialStatus==="PARTIAL"?"Abono registrado":"Por cobrar";
  const tone=order.totalAmount===null?"bg-slate-100 text-slate-600":order.financialStatus==="PAID"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const panel=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);
  useEffect(()=>{
    close.current=onClose;
  },[onClose]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const element=panel.current!;
    element.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();close.current();}
      if(event.key==="Tab"){
        const focusable=Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
        const first=focusable[0],last=focusable.at(-1);
        if(!first){event.preventDefault();return;}
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===element)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===element)){event.preventDefault();first.focus();}
      }
    };
    element.addEventListener("keydown",keydown);
    return()=>{document.body.style.overflow=overflow;element.removeEventListener("keydown",keydown);previous?.focus();};
  },[]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"><div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-xl font-bold text-slate-900">{title}</h2><button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Icon name="close" /></button></header><div className="overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div></div></div>;
}

function Totals({order}:{order:CashierOrder}) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[["Total aprobado",order.totalAmount],["Pagado",order.totalPaid],["Saldo pendiente",order.balance]].map(([label,value])=><div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value===null?"Sin cotización":money(Number(value))}</dd></div>)}</dl>;
}

export function CashierOrders({items,onPay}:{items:CashierOrder[];onPay:(order:CashierOrder)=>void}) {
  const [summaryId,setSummaryId]=useState<string|null>(null);
  return <><header><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gestión de caja</p><h2 className="mt-1 text-[28px] font-bold">Cobros y órdenes</h2><p className="mt-1 text-sm text-slate-600">Revisa el trabajo realizado y el saldo pendiente antes de cobrar.</p></header><section className="stitch-card overflow-hidden"><div className="overflow-x-auto"><table className="stitch-table"><thead><tr><th>Orden / Cliente</th><th>Total aprobado</th><th>Pagado</th><th>Saldo pendiente</th><th>Estado del pago</th><th>Estado del trabajo</th><th>Acciones</th></tr></thead><tbody>{items.map(order=><tr key={order.workOrderId}><td><button className="font-semibold text-slate-900 hover:underline" onClick={()=>setSummaryId(order.workOrderId)}>{order.workOrderCode}</button><span className="mt-1 block text-sm text-slate-500">{order.clientName}</span></td><td className="whitespace-nowrap tabular-nums">{order.totalAmount===null?<span className="text-xs text-slate-500">Sin cotización</span>:money(order.totalAmount)}</td><td className="whitespace-nowrap tabular-nums text-slate-600">{money(order.totalPaid)}</td><td className="whitespace-nowrap font-semibold tabular-nums">{order.balance===null?"Por definir":money(order.balance)}</td><td><FinancialBadge order={order}/></td><td><StatusBadge status={order.operationalStatus}/></td><td><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label={`Ver resumen ${order.workOrderCode}`} className="stitch-button stitch-button-secondary" onClick={()=>setSummaryId(order.workOrderId)}><Icon name="visibility"/>Resumen</button>{canPay(order)?<button type="button" className="stitch-button stitch-button-primary" onClick={()=>onPay(order)}><Icon name="payments"/>Cobrar</button>:<span className="text-xs text-slate-500">{order.totalAmount===null?"Requiere cotización":"Sin saldo"}</span>}</div></td></tr>)}{!items.length&&<tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay órdenes para mostrar.</td></tr>}</tbody></table></div></section>{summaryId&&<OrderSummary id={summaryId} onClose={()=>setSummaryId(null)} onPay={order=>{setSummaryId(null);onPay(order);}}/>}</>;
}

function OrderSummary({id,onClose,onPay}:{id:string;onClose:()=>void;onPay:(order:CashierOrder)=>void}) {
  const [order,setOrder]=useState<CashierOrderDetail|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;void apiRequest<{order:CashierOrderDetail}>(`/api/cashier/orders/${encodeURIComponent(id)}/summary`).then(result=>{if(active)setOrder(result.order);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
  return <Modal title="Resumen de la orden" onClose={onClose}>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:!order?<p className="text-sm text-slate-500">Cargando resumen…</p>:<div className="space-y-5"><div><p className="font-mono text-sm font-semibold text-slate-500">{order.workOrderCode}</p><h3 className="mt-1 text-2xl font-bold">{order.clientName}</h3><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={order.operationalStatus}/><FinancialBadge order={order}/></div></div><Totals order={order}/><dl className="grid gap-4 text-sm sm:grid-cols-2">{[["Motor",`${order.engineBrand} ${order.engineModel}`],["Serie",order.engineSerial??"No registrada"],["Servicio",order.serviceType],["Técnico asignado",order.assignedWorker??"Sin asignar"],["Avance del trabajo",`${order.progress}%`],["Fecha estimada",order.estimatedDate?date(order.estimatedDate):"No definida"]].map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><div className="rounded-lg bg-slate-50 p-4"><h4 className="text-sm font-semibold">Descripción del trabajo</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{order.description}</p></div>{Boolean(order.partsCharges?.length)&&<section className="rounded-lg border border-slate-200 p-4"><h4 className="text-sm font-semibold">Repuestos incluidos en el total</h4><ul className="mt-2 divide-y divide-slate-100">{order.partsCharges.map(charge=><li key={charge.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{charge.name}<small className="block text-slate-500">{charge.quantity} × {money(charge.unitPrice)}</small></span><strong>{money(charge.amount)}</strong></li>)}</ul><p className="mt-2 text-xs text-slate-500">Estos cargos ya forman parte del total aprobado.</p></section>}<section><h4 className="mb-2 text-sm font-semibold">Pagos de esta orden</h4>{order.payments.length?<ul className="divide-y divide-slate-100">{order.payments.map(payment=><li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{date(payment.createdAt)} · {payment.method}<small className="block text-slate-500">{payment.reference??"Sin referencia"}</small></span><strong className="tabular-nums">{money(payment.amount)}</strong></li>)}</ul>:<p className="text-sm text-slate-500">Todavía no hay pagos registrados.</p>}</section><footer className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button className="stitch-button stitch-button-secondary" onClick={onClose}>Cerrar</button>{canPay(order)&&<button className="stitch-button stitch-button-primary" onClick={()=>onPay(order)}>Registrar pago</button>}</footer></div>}</Modal>;
}

export function CashierPayModal({order,onClose,onSaved}:{order:CashierOrder;onClose:()=>void;onSaved:()=>void}) {
  const [amount,setAmount]=useState("");
  const [method,setMethod]=useState("Efectivo");
  const [reference,setReference]=useState("");
  const [notes,setNotes]=useState("");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const value=Number(amount);
  const valid=canPay(order)&&amount!==""&&Number.isFinite(value)&&value>0&&value<=order.balance!&&Math.abs(value*100-Math.round(value*100))<0.00001;
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(saving)return;setError("");
    if(!valid){setError("Ingresa un monto válido que no supere el saldo pendiente, con un máximo de dos decimales.");return;}
    try{setSaving(true);await cashierService.create({workOrderId:order.workOrderId,amount:value,method,reference:reference.trim()||null,notes:notes.trim()||null});onSaved();}catch(e){setError(e instanceof Error?e.message:"No se pudo registrar el pago.");}finally{setSaving(false);}
  };
  const close=()=>{if(!saving)onClose();};
  return <Modal title="Registrar pago" onClose={close}><form onSubmit={submit} className="space-y-5"><div><p className="font-mono text-sm text-slate-500">{order.workOrderCode}</p><h3 className="mt-1 text-lg font-semibold">{order.clientName}</h3></div><Totals order={order}/><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Monto a cobrar (Q)<input required type="number" min="0.01" max={order.balance??0} step="0.01" className="stitch-input mt-2" placeholder="0.00" value={amount} onChange={event=>setAmount(event.target.value)}/>{canPay(order)&&<button type="button" className="mt-2 text-xs font-semibold text-slate-600 underline" onClick={()=>setAmount(order.balance!.toFixed(2))}>Cobrar saldo completo</button>}</label><label className="text-sm font-medium">Método de pago<select className="stitch-input mt-2" value={method} onChange={event=>{setMethod(event.target.value);setReference("");}}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option></select></label>{method!=="Efectivo"&&<label className="text-sm font-medium sm:col-span-2">Referencia {method==="Transferencia"?"bancaria (obligatoria)":"del pago (opcional)"}<input required={method==="Transferencia"} maxLength={120} className="stitch-input mt-2" value={reference} onChange={event=>setReference(event.target.value)} /></label>}<label className="text-sm font-medium sm:col-span-2">Notas (opcional)<textarea maxLength={2000} className="stitch-input mt-2 min-h-20 py-2" value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Observaciones del cobro"/></label></fieldset>{valid&&<div className="flex flex-wrap justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm" aria-live="polite"><span>A cobrar: <strong>{money(value)}</strong></span><span>Saldo después del pago: <strong>{money(Math.max(0,order.balance!-value))}</strong></span></div>}{error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" disabled={saving} className="stitch-button stitch-button-secondary" onClick={close}>Cancelar</button><button disabled={saving||!valid||(method==="Transferencia"&&!reference.trim())} className="stitch-button stitch-button-primary disabled:cursor-not-allowed disabled:opacity-50">{saving?"Registrando…":valid?`Confirmar ${money(value)}`:"Confirmar pago"}</button></footer></form></Modal>;
}
