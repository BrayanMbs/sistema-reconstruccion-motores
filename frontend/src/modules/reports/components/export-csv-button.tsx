"use client";

import { useRef, useState } from "react";
import { Icon } from "@/shared/components/icon";
import type { ReportExportType } from "../models/reports";
import { reportsService } from "../services/reports.service";

export function ExportCsvButton({ type, filters }: { type: ReportExportType; filters: object }) {
  const active = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "warning"; text: string } | null>(null);

  const download = async () => {
    if (active.current) return;
    active.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const result = await reportsService.exportCsv(type, filters);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      if (result.truncated) setMessage({ kind: "warning", text: `Se exportaron las primeras 5,000 filas de ${result.total} resultados.` });
    } catch {
      setMessage({ kind: "error", text: "No fue posible exportar el reporte. Intenta nuevamente." });
    } finally {
      active.current = false;
      setLoading(false);
    }
  };

  return <div className="flex flex-col items-start gap-2 sm:items-end"><button type="button" className="stitch-button stitch-button-secondary disabled:cursor-not-allowed disabled:opacity-60" disabled={loading} onClick={() => void download()}><Icon name={loading ? "refresh" : "assessment"} className={loading ? "animate-spin" : ""} />{loading ? "Exportando..." : "Exportar CSV"}</button>{message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs ${message.kind === "error" ? "text-red-700" : "text-amber-700"}`}>{message.text}</p>}</div>;
}

