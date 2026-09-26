"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";
import {
  PrivateNavigation,
  type PrivateNavigationItem
} from "@/modules/auth/components/private-navigation";
import { Icon } from "@/shared/components/icon";
import type { AppUser } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import { roleHome } from "@/shared/utils/role-home";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/users", label: "Usuarios y roles", icon: "group" },
  { href: "/admin/clients", label: "Clientes", icon: "handshake" },
  { href: "/admin/work-orders", label: "Órdenes de trabajo", icon: "engineering" },
  { href: "/admin/operators", label: "Personal operativo", icon: "group" },
  { href: "/admin/inventory", label: "Inventario", icon: "inventory" },
  { href: "/admin/finance", label: "Finanzas", icon: "payments" },
  { href: "/admin/reports", label: "Reportes", icon: "assessment" },
  { href: "/admin/settings", label: "Configuración", icon: "settings" },
  { href: "/admin/audit", label: "Auditoría", icon: "history_edu" }
] satisfies ReadonlyArray<PrivateNavigationItem>;

export function AdminShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("NO_SESSION");

        const result = await apiRequest<{ user: AppUser }>("/api/auth/me");
        if (result.user.mustChangePassword) {
          router.replace("/cambiar-contrasena");
          return;
        }
        if (result.user.role !== "ADMIN") {
          router.replace(roleHome(result.user.role));
          return;
        }
        setUser(result.user);
      } catch {
        await getSupabase()?.auth.signOut();
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    void verify();
  }, [router]);

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    router.replace("/login");
  };

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Validando acceso administrativo...</main>;
  }
  if (!user) return null;

  return (
    <PrivateNavigation
      pathname={pathname}
      user={user}
      title="Panel de Administración"
      roleLabel="Administrador"
      drawerLabel="Navegación de administrador"
      navigation={navigation}
      onSignOut={signOut}
      desktopHeaderContent={
        <div className="relative hidden w-full max-w-md lg:block">
          <Icon name="search" className="absolute left-3 top-2.5 text-slate-500" />
          <input
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-blue-700 outline-none focus:border-blue-600"
            placeholder="Buscar en el sistema..."
          />
        </div>
      }
    >
      {children}
    </PrivateNavigation>
  );
}
