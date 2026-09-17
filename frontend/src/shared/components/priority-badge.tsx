import type { WorkOrderPriority } from "@/shared/models/admin";
const labels: Record<WorkOrderPriority, string> = { NORMAL: "Normal", HIGH: "Alta", URGENT: "Urgente" };
export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) { const tone = priority === "URGENT" ? "bg-red-100 text-red-700" : priority === "HIGH" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"; return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>{labels[priority]}</span>; }
