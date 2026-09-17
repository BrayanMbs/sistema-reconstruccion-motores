import type { Role } from "@/shared/models/admin";

export const roleHome = (role: Role) => role === "ADMIN" ? "/admin/dashboard" : role === "OPERATOR" ? "/operativo/inicio" : "/login";
