import type { WorkOrderStatus } from "../models/admin";

const orderLabels: Record<WorkOrderStatus, string> = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLETED: "Finalizada", CANCELLED: "Cancelada" };
export const StatusBadge = ({ active, status }: { active?: boolean; status?: WorkOrderStatus }) => {
  const label = status ? orderLabels[status] : active ? "Activo" : "Inactivo";
  const color = status === "COMPLETED" || active ? "bg-blue-50 text-blue-700 border-blue-200" : status === "IN_PROGRESS" ? "bg-amber-50 text-amber-800 border-amber-200" : status === "CANCELLED" || active === false ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-orange-50 text-orange-800 border-orange-200";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
};
