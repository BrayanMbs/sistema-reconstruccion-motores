import type { Role } from "@/shared/models/admin";

export const roleHome = (role: Role) =>
  role === "ADMIN"
    ? "/admin/dashboard"
    : role === "ADMINISTRATIVE"
      ? "/administrativo/dashboard"
      : role === "OPERATOR"
      ? "/operativo/inicio"
        : role === "INVENTORY"
          ? "/inventario"
          : "/login";
