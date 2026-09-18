"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { PublicPortalLayout } from "./public-portal-layout";
import { PublicTrackingForm } from "./public-tracking-form";
import { PublicTrackingResult } from "./public-tracking-result";
import type { PublicOrderTracking, PublicTrackingQuery } from "../models/public-tracking";
import { findPublicTracking } from "../services/public-tracking.service";

const emptyQuery: PublicTrackingQuery = { orderNumber: "", trackingCode: "" };

export function PublicTrackingView() {
  const [query, setQuery] = useState<PublicTrackingQuery>(emptyQuery);
  const [tracking, setTracking] = useState<PublicOrderTracking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (field: keyof PublicTrackingQuery, value: string) => setQuery((current) => ({ ...current, [field]: value }));
  const clear = () => { setQuery(emptyQuery); setError(""); setTracking(null); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setTracking(null);
    if (!query.orderNumber.trim() || !query.trackingCode.trim()) { setError("Ingresa el número de orden y el código de seguimiento."); return; }
    setLoading(true);
    try { setTracking(await findPublicTracking({ orderNumber: query.orderNumber.trim(), trackingCode: query.trackingCode.trim() })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible realizar la consulta."); }
    finally { setLoading(false); }
  };
  return <PublicPortalLayout>{tracking ? <PublicTrackingResult tracking={tracking} onAnotherQuery={clear} /> : <div className="mx-auto w-full max-w-[620px] px-4 py-10 sm:px-6 sm:py-14"><PublicTrackingForm values={query} error={error} loading={loading} onChange={update} onSubmit={submit} onClear={clear} /><section id="ayuda" className="mt-6 rounded-xl border border-[#cbd5e1] bg-white p-5"><h2 className="font-semibold">¿Necesitas ayuda?</h2><p className="mt-1 text-sm text-[#475569]">Si no encuentras tu comprobante, comunícate directamente con la empresa.</p></section><section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed text-[#475569]"><p className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#16324f]">Consulta segura</p><ul className="mt-3 list-disc space-y-1.5 pl-5"><li>No compartas tu código de seguimiento con terceros.</li><li>Este portal no solicita contraseñas ni datos bancarios.</li><li>No revela si un número de orden existe cuando el código no coincide.</li></ul></section></div>}</PublicPortalLayout>;
}
