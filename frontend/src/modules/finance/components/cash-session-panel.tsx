"use client";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/shared/services/api";

type Session = { id:string; openedAt:string; closedAt:string|null; openingAmount:number; countedCash:number|null; expectedCash:number; paymentCount:number; totalCollected:number; cashCollected:number; closingNotes:string|null };
const money=(value:number)=>new Intl.NumberFormat("es-GT",{style:"currency",currency:"GTQ"}).format(value);
const date=(value:string)=>new Intl.DateTimeFormat("es-GT",{dateStyle:"short",timeStyle:"short",timeZone:"America/Guatemala"}).format(new Date(value));

export function CashSessionPanel({history=false,onChanged}:{history?:boolean;onChanged:()=>void}) {
  const [sessions,setSessions]=useState<Session[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");
  const [amount,setAmount]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [attempt,setAttempt]=useState(0);
  const current=sessions.find(s=>!s.closedAt);
  useEffect(()=>{let active=true;setError("");setLoaded(false);void apiRequest<{sessions:Session[]}>("/api/cashier/sessions").then(result=>{if(active){setSessions(result.sessions);setLoaded(true);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[attempt]);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setError("");setMessage("");setSaving(true);
    try {
      await apiRequest(`/api/cashier/sessions/${current?"close":"open"}`,{method:"POST",body:JSON.stringify(current?{sessionId:current.id,countedCash:amount,notes}:{openingAmount:amount})});
      setAmount("");setNotes("");
      setMessage(current?"Caja cerrada correctamente.":"Caja abierta. Ya puedes registrar cobros.");
      setSessions((await apiRequest<{sessions:Session[]}>("/api/cashier/sessions")).sessions);
      onChanged();
    }catch(e){setError(e instanceof Error?e.message:"No se pudo actualizar la caja.");}finally{setSaving(false);}
  };
  const difference=current&&amount!==""?Math.round((Number(amount)-current.expectedCash)*100)/100:null;
  return <section className="stitch-card overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6"><div><h3 className="font-semibold text-slate-900">{current?"Turno actual":"Comenzar un turno"}</h3><p className="mt-1 text-xs text-slate-500">{current?`Apertura: ${date(current.openedAt)}`:"Registra el fondo inicial para habilitar los cobros."}</p></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${current?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}><span className={`size-1.5 rounded-full ${current?"bg-emerald-500":"bg-slate-400"}`} aria-hidden="true"/>{!loaded?(error?"Sin conexión con caja":"Consultando…"):current?"Caja abierta":"Caja cerrada"}</span></header>
    {error&&<div role="alert" className="m-5 flex flex-wrap items-center justify-between gap-3 rounded bg-red-50 p-3 text-sm text-red-800"><span>{error}</span>{!loaded&&<button type="button" className="font-semibold underline" onClick={()=>setAttempt(value=>value+1)}>Reintentar</button>}</div>}
    {message&&<p role="status" className="m-5 rounded bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loaded&&<div className="grid lg:grid-cols-[1fr_1fr]"><div className="space-y-4 bg-slate-50/70 p-5 sm:p-6 lg:border-r lg:border-slate-200">{current?<><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-medium text-slate-500">Efectivo esperado en caja</p><p className="mt-2 break-words text-3xl font-bold tracking-tight tabular-nums text-slate-900">{money(current.expectedCash)}</p><p className="mt-2 text-xs text-slate-500">Fondo inicial + cobros en efectivo</p></div><dl className="divide-y divide-slate-200 text-sm">{[["Fondo inicial",current.openingAmount],["Cobros en efectivo",current.cashCollected],["Total cobrado en el turno",current.totalCollected]].map(([label,value])=><div key={String(label)} className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-slate-600">{label}</dt><dd className="font-semibold tabular-nums text-slate-900">{money(Number(value))}</dd></div>)}</dl><p className="text-xs leading-relaxed text-slate-500">{current.paymentCount} pagos registrados. Las transferencias y tarjetas no se incluyen en el efectivo esperado.</p></>:<><h4 className="text-lg font-semibold text-slate-900">Prepara tu caja</h4><p className="max-w-md text-sm leading-relaxed text-slate-500">Cuenta el efectivo disponible y registra el monto con el que comienza tu turno.</p><p className="text-xs text-slate-500">Puedes abrir con Q 0.00 si no tienes fondo inicial.</p></>}</div>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6"><div><h4 className="font-semibold text-slate-900">{current?"Arqueo y cierre":"Apertura de caja"}</h4><p className="mt-1 text-xs text-slate-500">{current?"Cuenta el efectivo físico y compáralo con el esperado.":"Ingresa el efectivo inicial en quetzales."}</p></div><label className="block text-sm font-medium text-slate-700">{current?"Efectivo contado al cierre":"Monto inicial en efectivo"}<div className="relative mt-2"><span aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-sm font-semibold text-slate-400">Q</span><input required min="0" max="9999999999.99" step="0.01" type="number" className="stitch-input !pl-8 tabular-nums" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" /></div></label>
      {current&&<><div className={`rounded-lg border px-3 py-2.5 text-sm ${difference===null?"border-slate-200 bg-slate-50 text-slate-500":difference?"border-amber-200 bg-amber-50 text-amber-800":"border-emerald-200 bg-emerald-50 text-emerald-700"}`} aria-live="polite">{difference===null?"Ingresa el conteo para calcular la diferencia.":<div className="flex flex-wrap justify-between gap-2"><span>{difference===0?"Caja cuadrada":difference>0?"Sobrante de efectivo":"Faltante de efectivo"}</span><strong className="tabular-nums">{money(Math.abs(difference))}</strong></div>}</div><label className="block text-sm font-medium text-slate-700">Observaciones <span className="font-normal text-slate-400">{difference?"(obligatorias por diferencia)":"(opcional)"}</span><textarea required={Boolean(difference)} maxLength={2000} className="stitch-input mt-2 !h-20 resize-y py-2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Agrega una nota sobre el cierre…" /></label></>}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:items-end">{current&&<p className="w-full text-xs text-slate-500">Al confirmar, el turno quedará cerrado definitivamente.</p>}<button disabled={saving} className="stitch-button stitch-button-primary w-full disabled:opacity-50 sm:w-auto">{saving?"Guardando…":current?"Confirmar cierre de caja":"Abrir caja"}</button></div></form></div>}
    {history&&sessions.some(s=>s.closedAt)&&<div className="border-t border-slate-200 p-5"><h3 className="mb-3 font-semibold">Últimos cierres</h3><div className="space-y-3">{sessions.filter(s=>s.closedAt).map(s=><article key={s.id} className="rounded-lg border border-slate-200 p-4 text-sm"><p className="font-semibold">{date(s.openedAt)} — {date(s.closedAt!)}</p><div className="mt-2 flex flex-wrap gap-x-6 gap-y-2"><span>Inicial: {money(s.openingAmount)}</span><span>Esperado: {money(s.expectedCash)}</span><span>Contado: {money(s.countedCash!)}</span><span className="font-semibold">Diferencia: {money(s.countedCash!-s.expectedCash)}</span></div>{s.closingNotes&&<p className="mt-2 break-words text-slate-500">{s.closingNotes}</p>}</article>)}</div></div>}
  </section>;
}
