import type { ReactNode } from "react";
import { Icon } from "@/shared/components/icon";

export function PublicPortalLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#f8fafc] text-[#0f172a]">
    <header className="border-b border-[#cbd5e1] bg-white"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
      <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-[#16324f] text-white shadow-sm"><Icon name="settings" /></div><div><div className="flex flex-wrap items-center gap-2"><span className="text-xl font-bold tracking-tight">Motor Repair</span><span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#2563eb]">Portal Clientes</span></div><p className="text-xs font-medium text-[#475569]">Seguimiento de reparaciones</p></div></div>
      <a href="#ayuda" className="hidden items-center gap-2 text-sm font-medium text-[#475569] transition hover:text-[#2563eb] sm:flex"><Icon name="phone" className="size-4" />Ayuda</a>
    </div></header>
    <main className="flex-1">{children}</main>
    <footer className="border-t border-[#cbd5e1] bg-white py-7 text-xs text-[#475569]"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12"><div className="flex items-center gap-2 font-semibold text-[#0f172a]"><span className="flex size-6 items-center justify-center rounded bg-[#16324f] text-white"><Icon name="settings" className="size-3.5" /></span>Motor Repair</div><p>Portal público de seguimiento de reparaciones · © 2026</p></div></footer>
  </div>;
}
