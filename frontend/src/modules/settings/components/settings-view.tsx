"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { Icon } from "@/shared/components/icon";
import { ApiError } from "@/shared/services/api";
import type { SettingsForm } from "../dtos/settings.dto";
import { useSettings } from "../hooks/use-settings";
import { toSettingsForm, toSettingsPayload } from "../mappers/settings.mapper";
import {
  SETTINGS_LIMITS, hasSettingsErrors, sameSettings, validateSettingsForm,
  type AppSettings, type SettingsErrors, type SettingsField
} from "../models/settings";

type Feedback = { tone: "success" | "info" | "error"; message: string };

const feedbackStyles: Record<Feedback["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  error: "border-red-200 bg-red-50 text-red-800"
};

// Los mensajes del backend están escritos para el usuario; los errores de red no.
const saveErrorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : "No fue posible guardar la configuración. Verifica tu conexión e intenta nuevamente.";

export function SettingsView() {
  const { settings, loading, error, saving, save, reload } = useSettings();

  return <div className="mx-auto max-w-3xl">
    <div className="mb-6"><h2 className="text-[28px] font-bold">Configuración</h2><p className="mt-1 text-slate-600">Defina los datos del taller y las reglas financieras base.</p></div>
    {loading
      ? <div role="status" className="stitch-card flex h-40 items-center justify-center gap-3 text-sm text-slate-500"><Icon name="refresh" className="animate-spin text-blue-700" /><span>Cargando configuración...</span></div>
      : error || !settings
        ? <div role="alert" className="stitch-card border-red-200 bg-red-50 p-6 text-center text-red-800"><p className="font-semibold">No fue posible cargar la configuración.</p><p className="mt-1 text-sm">Intenta nuevamente. Si el problema continúa, verifica tu conexión.</p><button type="button" className="stitch-button stitch-button-secondary mt-4" onClick={reload}><Icon name="refresh" />Reintentar</button></div>
        : <SettingsFormPanel settings={settings} saving={saving} onSave={save} />}
  </div>;
}

function SettingsFormPanel({ settings, saving, onSave }: { settings: AppSettings; saving: boolean; onSave: (value: AppSettings) => Promise<AppSettings | null> }) {
  const [form, setForm] = useState<SettingsForm>(() => toSettingsForm(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const clearField = (field: SettingsField) => { setErrors((current) => ({ ...current, [field]: undefined })); setFeedback(null); };
  const setCompany = (field: keyof SettingsForm["company"], value: string) => { setForm((current) => ({ ...current, company: { ...current.company, [field]: value } })); clearField(field); };
  const setFinance = (field: keyof SettingsForm["finance"], value: string) => { setForm((current) => ({ ...current, finance: { ...current.finance, [field]: value } })); clearField(field); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validateSettingsForm(form);
    setErrors(nextErrors);
    if (hasSettingsErrors(nextErrors)) { setFeedback({ tone: "error", message: "Revisa los campos marcados antes de guardar." }); return; }
    const payload = toSettingsPayload(form);
    if (sameSettings(payload, settings)) { setFeedback({ tone: "info", message: "No hay cambios para guardar." }); return; }
    setFeedback(null);
    try {
      const saved = await onSave(payload);
      if (!saved) return;
      setForm(toSettingsForm(saved));
      setFeedback({ tone: "success", message: "Configuración guardada correctamente." });
    } catch (caught) {
      setFeedback({ tone: "error", message: saveErrorMessage(caught) });
    }
  };

  const invalid = (field: SettingsField) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `settings-${field}-error` : undefined });

  return <form aria-label="Configuración general" noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
    {feedback && <p role={feedback.tone === "error" ? "alert" : "status"} className={`rounded border p-3 text-sm ${feedbackStyles[feedback.tone]}`}>{feedback.message}</p>}
    <fieldset disabled={saving} className="space-y-5">
      <section className="stitch-card p-6"><h3 className="text-lg font-bold">Información del taller</h3><div className="mt-5 grid gap-4">
        <Field label="Nombre comercial" required field="name" error={errors.name}><input required maxLength={SETTINGS_LIMITS.name} className="stitch-input" value={form.company.name} onChange={(event) => setCompany("name", event.target.value)} {...invalid("name")} /></Field>
        <Field label="Teléfono" field="phone" error={errors.phone}><input type="tel" maxLength={SETTINGS_LIMITS.phone} className="stitch-input" value={form.company.phone} onChange={(event) => setCompany("phone", event.target.value)} {...invalid("phone")} /></Field>
        <Field label="Dirección" field="address" error={errors.address}><textarea maxLength={SETTINGS_LIMITS.address} className="stitch-input h-20 py-2" value={form.company.address} onChange={(event) => setCompany("address", event.target.value)} {...invalid("address")} /></Field>
      </div></section>
      <section className="stitch-card p-6"><h3 className="text-lg font-bold">Reglas financieras</h3><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Moneda" required field="currency" error={errors.currency} hint="Código de 3 letras, por ejemplo GTQ o USD."><input required maxLength={3} className="stitch-input" value={form.finance.currency} onChange={(event) => setFinance("currency", event.target.value.toUpperCase())} {...invalid("currency")} /></Field>
        <Field label="Impuesto (%)" required field="taxRate" error={errors.taxRate} hint="Porcentaje entre 0 y 100."><input required min="0" max="100" step="0.01" type="number" inputMode="decimal" className="stitch-input" value={form.finance.taxRate} onChange={(event) => setFinance("taxRate", event.target.value)} {...invalid("taxRate")} /></Field>
      </div></section>
    </fieldset>
    <div className="flex justify-end"><button type="submit" disabled={saving} aria-busy={saving} className="stitch-button stitch-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{saving ? "Guardando..." : "Guardar configuración"}</button></div>
  </form>;
}

function Field({ label, field, error, hint, required = false, children }: { label: string; field: SettingsField; error?: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <div>
    <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">{label}{required && <span className="text-red-600" aria-hidden="true"> *</span>}</span>{children}</label>
    {error ? <p id={`settings-${field}-error`} className="mt-1 text-xs text-red-700">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>;
}
