"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect, useState } from "react";
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
  { href: "/operativo/inicio", label: "Inicio", icon: "dashboard", exact: true },
  { href: "/operativo/ordenes", label: "Mis órdenes asignadas", icon: "engineering" },
  { href: "/operativo/actividad", label: "Mi actividad", icon: "history" },
  { href: "/operativo/notificaciones", label: "Notificaciones", icon: "history_edu" }
] satisfies ReadonlyArray<PrivateNavigationItem>;

export function OperationalShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const session = await getSupabase()?.auth.getSession();
        if (!session?.data.session) throw new Error("NO_SESSION");

        const result = await apiRequest<{ user: AppUser }>("/api/auth/me");
        if (result.user.mustChangePassword) {
          router.replace("/cambiar-contrasena");
          return;
        }
        if (result.user.role !== "OPERATOR") {
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
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Validando acceso operativo...</main>;
  }
  if (!user) return null;

  return (
    <PrivateNavigation
      pathname={pathname}
      user={user}
      title="Portal Operativo"
      roleLabel="Trabajador operativo"
      drawerLabel="Navegación operativa"
      navigation={navigation}
      onSignOut={signOut}
      brandIcon="engineering"
      desktopHeaderContent={
        <>
          <div className="relative hidden w-full max-w-xl lg:block">
            <Icon name="search" className="absolute left-3 top-2.5 text-slate-500" />
            <input
              className="h-10 w-full rounded-lg bg-slate-100 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Buscar órdenes, piezas, tareas..."
            />
          </div>
          <Link
            href="/operativo/notificaciones"
            className="ml-auto hidden rounded-full p-2 text-slate-600 hover:bg-slate-100 lg:block"
            aria-label="Notificaciones"
          >
            <Icon name="history_edu" />
          </Link>
        </>
      }
    >
      {children}
    </PrivateNavigation>
  );
}
