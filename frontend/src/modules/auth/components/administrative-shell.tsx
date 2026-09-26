"use client";

import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect, useState } from "react";
import {
  PrivateNavigation,
  type PrivateNavigationItem
} from "@/modules/auth/components/private-navigation";
import type { AppUser } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";
import { getSupabase } from "@/shared/services/supabase";
import { roleHome } from "@/shared/utils/role-home";

const navigation = [
  { href: "/administrativo/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/administrativo/clientes", label: "Clientes", icon: "handshake" },
  { href: "/administrativo/ordenes", label: "Órdenes de trabajo", icon: "engineering" },
  { href: "/administrativo/asignaciones", label: "Asignaciones", icon: "person_check" }
] satisfies ReadonlyArray<PrivateNavigationItem>;

export function AdministrativeShell({ children }: PropsWithChildren) {
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
        if (result.user.role !== "ADMINISTRATIVE") {
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
      title="Gestión Administrativa"
      roleLabel="Personal Administrativo"
      drawerLabel="Navegación administrativa"
      navigation={navigation}
      onSignOut={signOut}
      brandIcon="engineering"
    >
      {children}
    </PrivateNavigation>
  );
}
