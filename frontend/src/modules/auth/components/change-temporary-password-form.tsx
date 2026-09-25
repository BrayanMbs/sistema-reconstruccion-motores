"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import { roleHome } from "@/shared/utils/role-home";

const passwordMessage = "Usa al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.";
const validPassword = (value: string) => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export function ChangeTemporaryPasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

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
  return <form onSubmit={submit} className="stitch-card w-full max-w-[420px] p-7 sm:p-8"><h1 className="text-2xl font-bold text-slate-900">Actualiza tu contraseña</h1><p className="mt-2 text-sm text-slate-600">Por seguridad, debes reemplazar la contraseña temporal antes de continuar.</p>{error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}<label className="mt-6 block text-sm font-medium text-slate-700">Nueva contraseña<input required autoComplete="new-password" className="stitch-input mt-1.5" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><p className="mt-1 text-xs text-slate-500">{passwordMessage}</p><label className="mt-4 block text-sm font-medium text-slate-700">Confirmar nueva contraseña<input required autoComplete="new-password" className="stitch-input mt-1.5" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button disabled={saving} className="stitch-button stitch-button-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Actualizando..." : "Cambiar contraseña"}</button></form>;
}
