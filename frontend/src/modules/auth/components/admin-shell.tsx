"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";
import type { AppUser } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import { Icon, type IconName } from "@/shared/components/icon";
import { roleHome } from "@/shared/utils/role-home";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Usuarios y roles", icon: "group" },
  { href: "/admin/clients", label: "Clientes", icon: "handshake" },
  { href: "/admin/work-orders", label: "Órdenes de trabajo", icon: "engineering" },
  { href: "/admin/operators", label: "Personal operativo", icon: "group" },
  { href: "/admin/inventory", label: "Inventario", icon: "inventory" },
  { href: "/admin/finance", label: "Finanzas", icon: "payments" },
  { href: "/admin/reports", label: "Reportes", icon: "assessment" },
  { href: "/admin/settings", label: "Configuración", icon: "settings" },
  { href: "/admin/audit", label: "Auditoría", icon: "history_edu" }
] satisfies ReadonlyArray<{ href: string; label: string; icon: IconName }>;

export function AdminShell({ children }: PropsWithChildren) {
  const router = useRouter(); const pathname = usePathname(); const [user, setUser] = useState<AppUser | null>(null); const [checking, setChecking] = useState(true);
  useEffect(() => { const verify = async () => { try { const supabase = getSupabase(); if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED"); const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error("NO_SESSION"); const result = await apiRequest<{ user: AppUser }>("/api/auth/me"); if (result.user.role !== "ADMIN") { router.replace(roleHome(result.user.role)); return; } setUser(result.user); } catch { await getSupabase()?.auth.signOut(); router.replace("/login"); } finally { setChecking(false); } }; void verify(); }, [router]);
  const signOut = async () => { await getSupabase()?.auth.signOut(); router.replace("/login"); };
  if (checking) return <main className="flex min-h-screen items-center justify-center text-slate-500">Validando acceso administrativo...</main>;
  if (!user) return null;
  return <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col bg-[#16324f] py-6 md:flex"><div className="mb-8 flex items-center gap-3 px-6"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-blue-700"><Icon name="settings" /></div><div><p className="text-xl font-bold text-white">Motor Repair</p><p className="text-xs text-slate-300">Admin Panel</p></div></div><nav className="flex-1 space-y-1 px-3">{navigation.map((item) => <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition ${pathname === item.href ? "border-blue-500 bg-white/15 font-bold text-white" : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon name={item.icon} />{item.label}</Link>)}</nav><button onClick={() => void signOut()} className="mx-4 flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"><Icon name="logout" />Cerrar sesión</button></aside>
    <header className="fixed left-0 right-0 top-0 z-10 flex h-16 items-center justify-between gap-5 border-b border-slate-300 bg-white px-5 shadow-sm md:left-[260px]"><h1 className="shrink-0 text-base font-semibold">Panel de Administración</h1><div className="relative hidden w-full max-w-md lg:block"><Icon name="search" className="absolute left-3 top-2.5 text-slate-500" /><input className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-blue-700 outline-none focus:border-blue-600" placeholder="Buscar en el sistema..." /></div><div className="flex shrink-0 items-center gap-3"><span className="hidden text-right text-sm sm:block"><strong className="block text-slate-800">{user.fullName}</strong><small className="text-slate-500">Administrador</small></span><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">{user.fullName.charAt(0).toUpperCase()}</div></div></header>
    <main className="min-h-screen p-5 pt-24 md:ml-[260px] md:p-6 md:pt-24">{children}</main>
  </div>;
}
