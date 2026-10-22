import type { IconName } from "@/shared/components/icon";

export interface AuditActionInfo {
  label: string;
  category: string;
  icon: IconName;
  badgeColor: string;
  iconColor: string;
}

const ACTION_MAP: Record<string, AuditActionInfo> = {
  // Configuración
  SETTINGS_UPDATED: {
    label: "Configuración del taller actualizada",
    category: "Configuración",
    icon: "settings",
    badgeColor: "bg-indigo-50 text-indigo-700 border border-indigo-200/70",
    iconColor: "bg-indigo-50 text-indigo-600 border border-indigo-100"
  },

  // Usuarios
  USER_CREATED: {
    label: "Usuario registrado en el sistema",
    category: "Usuarios",
    icon: "person_add",
    badgeColor: "bg-blue-50 text-blue-700 border border-blue-200/70",
    iconColor: "bg-blue-50 text-blue-600 border border-blue-100"
  },
  USER_UPDATED: {
    label: "Datos de usuario actualizados",
    category: "Usuarios",
    icon: "edit",
    badgeColor: "bg-sky-50 text-sky-700 border border-sky-200/70",
    iconColor: "bg-sky-50 text-sky-600 border border-sky-100"
  },
  USER_ROLE_CHANGED: {
    label: "Rol de usuario modificado",
    category: "Usuarios",
    icon: "group",
    badgeColor: "bg-purple-50 text-purple-700 border border-purple-200/70",
    iconColor: "bg-purple-50 text-purple-600 border border-purple-100"
  },
  USER_ACTIVATED: {
    label: "Usuario activado",
    category: "Usuarios",
    icon: "person_check",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },
  USER_DEACTIVATED: {
    label: "Usuario inactivado",
    category: "Usuarios",
    icon: "person_off",
    badgeColor: "bg-slate-100 text-slate-700 border border-slate-200",
    iconColor: "bg-slate-100 text-slate-600 border border-slate-200"
  },

  // Seguridad y Contraseñas
  PASSWORD_RESET_BY_ADMIN: {
    label: "Contraseña restablecida por administrador",
    category: "Seguridad",
    icon: "key",
    badgeColor: "bg-amber-50 text-amber-700 border border-amber-200/70",
    iconColor: "bg-amber-50 text-amber-600 border border-amber-100"
  },
  PASSWORD_CHANGED_AFTER_RESET: {
    label: "Contraseña actualizada tras restablecimiento",
    category: "Seguridad",
    icon: "shield",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },
  AUTH_LOGIN_SUCCESS: {
    label: "Inicio de sesión exitoso",
    category: "Seguridad",
    icon: "shield",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },
  AUTH_LOGIN_FAILED: {
    label: "Intento fallido de autenticación",
    category: "Seguridad",
    icon: "shield",
    badgeColor: "bg-rose-50 text-rose-700 border border-rose-200/70",
    iconColor: "bg-rose-50 text-rose-600 border border-rose-100"
  },
  AUTH_ACCOUNT_LOCKED: {
    label: "Cuenta bloqueada temporalmente",
    category: "Seguridad",
    icon: "key",
    badgeColor: "bg-red-50 text-red-700 border border-red-200/70",
    iconColor: "bg-red-50 text-red-600 border border-red-100"
  },
  AUTH_LOGIN_BLOCKED: {
    label: "Acceso bloqueado en cuenta suspendida",
    category: "Seguridad",
    icon: "shield",
    badgeColor: "bg-red-50 text-red-700 border border-red-200/70",
    iconColor: "bg-red-50 text-red-600 border border-red-100"
  },
  AUTH_IP_BLOCKED: {
    label: "Dirección IP bloqueada por exceso de intentos",
    category: "Seguridad",
    icon: "shield",
    badgeColor: "bg-red-50 text-red-700 border border-red-200/70",
    iconColor: "bg-red-50 text-red-600 border border-red-100"
  },

  // Clientes
  CLIENT_CREATED: {
    label: "Nuevo cliente registrado",
    category: "Clientes",
    icon: "handshake",
    badgeColor: "bg-teal-50 text-teal-700 border border-teal-200/70",
    iconColor: "bg-teal-50 text-teal-600 border border-teal-100"
  },
  CLIENT_UPDATED: {
    label: "Información de cliente actualizada",
    category: "Clientes",
    icon: "edit",
    badgeColor: "bg-teal-50 text-teal-700 border border-teal-200/70",
    iconColor: "bg-teal-50 text-teal-600 border border-teal-100"
  },

  // Órdenes de Trabajo y Operaciones
  WORK_ORDER_CREATED: {
    label: "Orden de trabajo creada",
    category: "Órdenes",
    icon: "post_add",
    badgeColor: "bg-blue-50 text-blue-700 border border-blue-200/70",
    iconColor: "bg-blue-50 text-blue-600 border border-blue-100"
  },
  WORK_ORDER_UPDATED: {
    label: "Orden de trabajo modificada",
    category: "Órdenes",
    icon: "edit",
    badgeColor: "bg-sky-50 text-sky-700 border border-sky-200/70",
    iconColor: "bg-sky-50 text-sky-600 border border-sky-100"
  },
  WORK_ORDER_ASSIGNED: {
    label: "Técnico asignado a orden",
    category: "Órdenes",
    icon: "engineering",
    badgeColor: "bg-sky-50 text-sky-700 border border-sky-200/70",
    iconColor: "bg-sky-50 text-sky-600 border border-sky-100"
  },
  WORK_ORDER_TOTAL_UPDATED: {
    label: "Monto total de orden definido",
    category: "Finanzas",
    icon: "payments",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },
  WORK_STARTED: {
    label: "Trabajo en taller iniciado",
    category: "Operaciones",
    icon: "engineering",
    badgeColor: "bg-amber-50 text-amber-700 border border-amber-200/70",
    iconColor: "bg-amber-50 text-amber-600 border border-amber-100"
  },
  WORK_PROGRESS_UPDATED: {
    label: "Avance de trabajo registrado",
    category: "Operaciones",
    icon: "engineering",
    badgeColor: "bg-sky-50 text-sky-700 border border-sky-200/70",
    iconColor: "bg-sky-50 text-sky-600 border border-sky-100"
  },
  WORK_COMPLETED: {
    label: "Trabajo de reconstrucción finalizado",
    category: "Operaciones",
    icon: "person_check",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },

  // Pagos y Finanzas
  PAYMENT_CREATED: {
    label: "Pago o abono registrado",
    category: "Finanzas",
    icon: "payments",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },

  // Inventario
  INVENTORY_ITEM_CREATED: {
    label: "Producto registrado en catálogo",
    category: "Inventario",
    icon: "inventory",
    badgeColor: "bg-cyan-50 text-cyan-700 border border-cyan-200/70",
    iconColor: "bg-cyan-50 text-cyan-600 border border-cyan-100"
  },
  INVENTORY_ITEM_UPDATED: {
    label: "Producto de inventario modificado",
    category: "Inventario",
    icon: "edit",
    badgeColor: "bg-cyan-50 text-cyan-700 border border-cyan-200/70",
    iconColor: "bg-cyan-50 text-cyan-600 border border-cyan-100"
  },
  INVENTORY_ITEM_ACTIVATED: {
    label: "Producto de inventario activado",
    category: "Inventario",
    icon: "inventory",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },
  INVENTORY_ITEM_DEACTIVATED: {
    label: "Producto de inventario inactivado",
    category: "Inventario",
    icon: "inventory",
    badgeColor: "bg-slate-100 text-slate-700 border border-slate-200",
    iconColor: "bg-slate-100 text-slate-600 border border-slate-200"
  },
  INVENTORY_ENTRY_CREATED: {
    label: "Entrada de existencias registrada",
    category: "Inventario",
    icon: "add",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    iconColor: "bg-emerald-50 text-emerald-600 border border-emerald-100"
  },
  INVENTORY_EXIT_CREATED: {
    label: "Salida de existencias registrada",
    category: "Inventario",
    icon: "inventory",
    badgeColor: "bg-amber-50 text-amber-700 border border-amber-200/70",
    iconColor: "bg-amber-50 text-amber-600 border border-amber-100"
  },
  INVENTORY_ASSIGNED: {
    label: "Insumo asignado a orden",
    category: "Inventario",
    icon: "inventory",
    badgeColor: "bg-blue-50 text-blue-700 border border-blue-200/70",
    iconColor: "bg-blue-50 text-blue-600 border border-blue-100"
  },
  INVENTORY_RELEASED: {
    label: "Insumo liberado de orden",
    category: "Inventario",
    icon: "inventory",
    badgeColor: "bg-slate-100 text-slate-700 border border-slate-200",
    iconColor: "bg-slate-100 text-slate-600 border border-slate-200"
  }
};

export const getAuditActionInfo = (action: string): AuditActionInfo => {
  if (ACTION_MAP[action]) {
    return ACTION_MAP[action];
  }

  const readable = action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    label: readable,
    category: "Actividad",
    icon: "history",
    badgeColor: "bg-slate-100 text-slate-700 border border-slate-200",
    iconColor: "bg-slate-100 text-slate-600 border border-slate-200"
  };
};

export const formatAuditDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  } catch {
    return dateString;
  }
};

