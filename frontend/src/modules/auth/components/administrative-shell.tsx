"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect, useState } from "react";
import { Icon, type IconName } from "@/shared/components/icon";
import type { AppUser } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import { roleHome } from "@/shared/utils/role-home";

const navigation = [
  { href: "/administrativo/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/administrativo/clientes", label: "Clientes", icon: "handshake" },
  { href: "/administrativo/ordenes", label: "Órdenes de trabajo", icon: "engineering" },
  { href: "/administrativo/asignaciones", label: "Asignaciones", icon: "person_check" }
] satisfies ReadonlyArray<{ href: string; label: string; icon: IconName }>;

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return <nav className="flex-1 space-y-1 px-3">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "border-blue-500 bg-white/15 font-bold text-white" : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon name={item.icon} />{item.label}</Link>)}</nav>;
}

export function AdministrativeShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const session = await getSupabase()?.auth.getSession();
        if (!session?.data.session) throw new Error("NO_SESSION");
        const result = await apiRequest<{ user: AppUser }>("/api/auth/me");
        if (result.user.role !== "ADMINISTRATIVE") { router.replace(roleHome(result.user.role)); return; }
        setUser(result.user);
      } catch { await getSupabase()?.auth.signOut(); router.replace("/login"); }
      finally { setChecking(false); }
    };
    void verify();
  }, [router]);

  const signOut = async () => { await getSupabase()?.auth.signOut(); router.replace("/login"); };
  if (checking) return <main className="flex min-h-screen items-center justify-center text-slate-500">Validando acceso administrativo...</main>;
  if (!user) return null;

  return <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col bg-[#16324f] py-6 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-6"><div className="flex size-10 items-center justify-center rounded-full bg-blue-600 text-white"><Icon name="engineering" /></div><div><p className="text-xl font-bold text-white">Motor Repair</p><p className="text-xs text-slate-300">Personal Administrativo</p></div></div>
      <NavigationLinks pathname={pathname} />
      <button onClick={() => void signOut()} className="mx-4 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><Icon name="logout" />Cerrar sesión</button>
    </aside>
    {menuOpen && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuOpen(false)} aria-hidden="true" /><aside role="dialog" aria-modal="true" aria-label="Navegación administrativa" className="relative z-10 flex h-full w-[min(82vw,300px)] flex-col bg-[#16324f] py-6 shadow-2xl"><div className="mb-8 flex items-start justify-between gap-3 px-6"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-blue-600 text-white"><Icon name="engineering" /></div><div><p className="text-xl font-bold text-white">Motor Repair</p><p className="text-xs text-slate-300">Personal Administrativo</p></div></div><button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"><Icon name="close" /></button></div><NavigationLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} /><div className="border-t border-white/15 px-4 pt-4"><div className="mb-3 flex items-center gap-3 px-3"><div className="flex size-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{user.fullName.charAt(0).toUpperCase()}</div><div className="min-w-0"><strong className="block truncate text-sm text-white">{user.fullName}</strong><span className="text-xs text-slate-300">Personal Administrativo</span></div></div><button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><Icon name="logout" />Cerrar sesión</button></div></aside></div>}
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 shadow-sm sm:px-5 lg:left-[260px]"><div className="flex min-w-0 items-center gap-3"><button aria-label="Abrir menú" onClick={() => setMenuOpen(true)} className="shrink-0 rounded p-2 text-slate-700 hover:bg-slate-100 lg:hidden"><Icon name="menu" /></button><h1 className="truncate font-semibold">Gestión Administrativa</h1></div><div className="flex shrink-0 items-center gap-3"><span className="hidden text-right text-sm sm:block"><strong className="block">{user.fullName}</strong><small className="text-slate-500">Personal Administrativo</small></span><div className="flex size-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{user.fullName.charAt(0).toUpperCase()}</div></div></header>
    <main className="min-h-screen min-w-0 overflow-x-hidden p-5 pt-24 sm:p-6 sm:pt-24 lg:ml-[260px]">{children}</main>
  </div>;
}
