"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import { roleHome } from "@/shared/utils/role-home";
import { Icon } from "@/shared/components/icon";

const passwordMessage = "Usa al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.";
const validPassword = (value: string) => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export function ChangeTemporaryPasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const requirements = [
    { label: "Al menos 12 caracteres", valid: newPassword.length >= 12 },
    { label: "Una mayúscula", valid: /[A-Z]/.test(newPassword) },
    { label: "Una minúscula", valid: /[a-z]/.test(newPassword) },
    { label: "Un número", valid: /\d/.test(newPassword) },
    { label: "Un símbolo", valid: /[^A-Za-z0-9]/.test(newPassword) }
  ];
  const passwordsMatch = confirmation.length > 0 && newPassword === confirmation;

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSupabase()?.auth.getSession();
        if (!session?.data.session) throw new Error("NO_SESSION");
        const result = await apiRequest<{ user: AppUser }>("/api/auth/me");
        if (!result.user.mustChangePassword) {
          router.replace(roleHome(result.user.role));
          return;
        }
      } catch {
        await getSupabase()?.auth.signOut();
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!validPassword(newPassword)) { setError(passwordMessage); return; }
    if (newPassword !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true);
    try {
      const result = await apiRequest<{ user: AppUser }>("/api/auth/change-temporary-password", { method: "POST", body: JSON.stringify({ newPassword }) });
      setNewPassword("");
      setConfirmation("");
      router.replace(roleHome(result.user.role));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) return <p className="text-slate-500">Validando sesión...</p>;
  return <form onSubmit={submit} className="stitch-card w-full max-w-[420px] p-7 sm:p-8">
    <h1 className="text-2xl font-bold text-slate-900">Actualiza tu contraseña</h1>
    <p className="mt-2 text-sm text-slate-600">Por seguridad, debes reemplazar la contraseña temporal antes de continuar.</p>
    {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    <label className="mt-6 block text-sm font-medium text-slate-700">Nueva contraseña
      <span className="relative mt-1.5 block"><input required autoComplete="new-password" className="stitch-input pr-12" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button type="button" aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-blue-700"><Icon name={showNewPassword ? "visibility_off" : "visibility"} /></button></span>
    </label>
    <ul aria-label="Requisitos de contraseña" className="mt-2 grid gap-1 text-xs sm:grid-cols-2">{requirements.map((item) => <li key={item.label} className={item.valid ? "text-emerald-700" : "text-slate-500"}><span aria-hidden="true" className="mr-1">{item.valid ? "✓" : "○"}</span>{item.label}</li>)}</ul>
    <label className="mt-4 block text-sm font-medium text-slate-700">Confirmar nueva contraseña
      <span className="relative mt-1.5 block"><input required autoComplete="new-password" className="stitch-input pr-12" type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /><button type="button" aria-label={showConfirmation ? "Ocultar confirmación" : "Mostrar confirmación"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-blue-700"><Icon name={showConfirmation ? "visibility_off" : "visibility"} /></button></span>
    </label>
    {confirmation && <p role="status" className={`mt-2 text-xs font-medium ${passwordsMatch ? "text-emerald-700" : "text-red-700"}`}>{passwordsMatch ? "✓ Las contraseñas coinciden" : "○ Las contraseñas no coinciden"}</p>}
    <button disabled={saving} className="stitch-button stitch-button-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Actualizando..." : "Cambiar contraseña"}</button>
  </form>;
}
