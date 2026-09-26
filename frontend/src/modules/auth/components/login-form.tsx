"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiBaseUrl } from "@/shared/services/api";
import { Icon } from "@/shared/components/icon";
import { getSupabase } from "@/shared/services/supabase";
import type { AppUser } from "@/shared/models/admin";
import { roleHome } from "@/shared/utils/role-home";

type LoginResponse = { user: AppUser; session: { accessToken: string; refreshToken: string } };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (!email || !password) { setError("Ingresa tu correo y contraseña."); return; }
    const supabase = getSupabase();
    if (!supabase) { setError("Supabase Auth no está configurado en este entorno."); return; }
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json() as LoginResponse & { message?: string };
      if (!response.ok) throw new ApiError(result.message ?? "No fue posible iniciar sesión", response.status);
      const { error: sessionError } = await supabase.auth.setSession({ access_token: result.session.accessToken, refresh_token: result.session.refreshToken });
      if (sessionError) throw sessionError;
      router.replace(result.user.mustChangePassword ? "/cambiar-contrasena" : roleHome(result.user.role)); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible iniciar sesión"); }
    finally { setLoading(false); }
  };

  return <form onSubmit={submit} className="stitch-card w-full max-w-[420px] p-7 sm:p-8">
    <div className="mb-7 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Icon name="settings" /></div><div><h1 className="text-xl font-bold text-slate-900">Motor Repair</h1><p className="text-sm text-slate-500">Panel de Administración</p></div></div>
    <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2><p className="mt-1 text-sm text-slate-500">Accede con tu cuenta administrativa.</p>
    {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    <label className="mt-6 block text-sm font-medium text-slate-700">Correo electrónico<input className="stitch-input mt-1.5" value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label>
    <label className="mt-4 block text-sm font-medium text-slate-700">Contraseña<span className="relative mt-1.5 block"><input className="stitch-input pr-11" value={password} type={showPassword ? "text" : "password"} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onMouseDown={(event) => event.preventDefault()} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-500 hover:bg-slate-100 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"><Icon name={showPassword ? "visibility_off" : "visibility"} /></button></span></label>
    <button disabled={loading} className="stitch-button stitch-button-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Validando sesión..." : "Ingresar al panel"}</button>
  </form>;
}
