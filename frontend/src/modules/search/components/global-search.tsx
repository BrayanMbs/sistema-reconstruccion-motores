"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/shared/components/icon";
import { apiRequest } from "@/shared/services/api";
import type { GlobalSearchResponse } from "../models/search";

interface SystemPage {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  keywords: string;
}

const SYSTEM_PAGES: SystemPage[] = [
  { title: "Panel de Control", description: "Resumen administrativo y métricas", href: "/admin/dashboard", icon: "dashboard", keywords: "inicio dashboard panel metricas resumen principal" },
  { title: "Órdenes de Trabajo", description: "Supervisión, motores y diagnóstico", href: "/admin/work-orders", icon: "engineering", keywords: "ordenes trabajos reparaciones motores diagnostico culatas servicios" },
  { title: "Clientes", description: "Directorio de clientes y registros", href: "/admin/clients", icon: "handshake", keywords: "clientes directorio dpi nit telefono personas empresas contacto" },
  { title: "Usuarios", description: "Gestión de roles y accesos al sistema", href: "/admin/users", icon: "group", keywords: "usuarios cuentas roles accesos administradores contraseñas" },
  { title: "Inventario", description: "Repuestos, insumos y existencias", href: "/admin/inventory", icon: "inventory", keywords: "inventario repuestos piezas stock insumos rep- culatas empaques" },
  { title: "Finanzas y Pagos", description: "Saldos, cobros y presupuestos", href: "/admin/finance", icon: "payments", keywords: "finanzas pagos cobros facturas saldos dinero caja cuentas" },
  { title: "Reportes Operativos", description: "Estadísticas y exportación en CSV", href: "/admin/reports", icon: "assessment", keywords: "reportes metricas exportar csv balances resumenes" },
  { title: "Auditoría del Sistema", description: "Historial de seguridad y eventos", href: "/admin/audit", icon: "history", keywords: "auditoria seguridad logs registros actividad eventos cambios" },
  { title: "Configuración General", description: "Ajustes del taller e impuestos", href: "/admin/settings", icon: "settings", keywords: "configuracion ajustes taller empresa impuestos moneda datos" },
  { title: "Trabajadores Operativos", description: "Mecánicos y técnicos de taller", href: "/admin/operators", icon: "person_check", keywords: "operadores mecanicos tecnicos trabajadores personal asignacion" },
  { title: "Portal de Seguimiento", description: "Búsqueda pública por código o QR", href: "/seguimiento", icon: "qr_code", keywords: "seguimiento publico qr rastreo cliente orden codigo" }
];

export interface SearchFlatItem {
  id: string;
  category: "Páginas" | "Órdenes de trabajo" | "Clientes" | "Usuarios" | "Inventario";
  title: string;
  subtitle: string;
  href: string;
  icon: IconName;
  badge?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResponse["results"] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Handle global keyboard shortcuts: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      void apiRequest<GlobalSearchResponse>(`/api/admin/search?q=${encodeURIComponent(trimmed)}`)
        .then((response) => {
          setData(response.results);
          setSelectedIndex(0);
        })
        .catch(() => {
          setData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Matching system pages based on query
  const matchingPages = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return SYSTEM_PAGES.filter(
      (page) =>
        page.title.toLowerCase().includes(trimmed) ||
        page.keywords.toLowerCase().includes(trimmed)
    ).slice(0, 3);
  }, [query]);

  // Flattened results for keyboard navigation
  const flatItems = useMemo<SearchFlatItem[]>(() => {
    const items: SearchFlatItem[] = [];

    matchingPages.forEach((p) => {
      items.push({
        id: `page-${p.href}`,
        category: "Páginas",
        title: p.title,
        subtitle: p.description,
        href: p.href,
        icon: p.icon
      });
    });

    if (data?.orders) {
      data.orders.forEach((o) => {
        items.push({
          id: `order-${o.id}`,
          category: "Órdenes de trabajo",
          title: `${o.code} · ${o.engineBrand} ${o.engineModel}`,
          subtitle: `Cliente: ${o.clientName}`,
          href: `/admin/work-orders?search=${encodeURIComponent(o.code)}`,
          icon: "engineering",
          badge: o.status
        });
      });
    }

    if (data?.clients) {
      data.clients.forEach((c) => {
        items.push({
          id: `client-${c.id}`,
          category: "Clientes",
          title: c.fullName,
          subtitle: `${c.identificationType}: ${c.identification} ${c.phone ? `· Tel: ${c.phone}` : ""}`,
          href: `/admin/clients?search=${encodeURIComponent(c.identification)}`,
          icon: "handshake"
        });
      });
    }

    if (data?.users) {
      data.users.forEach((u) => {
        items.push({
          id: `user-${u.id}`,
          category: "Usuarios",
          title: u.fullName,
          subtitle: u.email,
          href: `/admin/users?search=${encodeURIComponent(u.email)}`,
          icon: "group",
          badge: u.role
        });
      });
    }

    if (data?.inventory) {
      data.inventory.forEach((i) => {
        items.push({
          id: `inv-${i.id}`,
          category: "Inventario",
          title: `${i.code} - ${i.name}`,
          subtitle: `${i.category} ${i.brand ? `· Marca: ${i.brand}` : ""} · Stock: ${i.stock}`,
          href: `/admin/inventory`,
          icon: "inventory"
        });
      });
    }

    return items;
  }, [matchingPages, data]);

  const selectItem = (item: SearchFlatItem) => {
    setIsOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || flatItems.length === 0) {
      if (event.key === "Enter" && query.trim()) {
        event.preventDefault();
        setIsOpen(false);
        router.push(`/admin/work-orders?search=${encodeURIComponent(query.trim())}`);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        selectItem(current);
      } else if (query.trim()) {
        setIsOpen(false);
        router.push(`/admin/work-orders?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const clear = () => {
    setQuery("");
    setData(null);
    inputRef.current?.focus();
  };

  const hasContent = query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Icon name="search" className="pointer-events-none absolute left-3 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen && hasContent}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-16 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
          placeholder="Buscar en el sistema..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {loading && (
            <Icon name="refresh" className="size-4 animate-spin text-blue-600" />
          )}
          {query ? (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={clear}
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none hidden select-none rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-sm sm:inline-block">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {isOpen && hasContent && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {flatItems.length > 0 ? (
            <div className="space-y-3">
              {/* Group items by category */}
              {(["Páginas", "Órdenes de trabajo", "Clientes", "Usuarios", "Inventario"] as const).map(
                (category) => {
                  const categoryItems = flatItems.filter((item) => item.category === category);
                  if (!categoryItems.length) return null;

                  return (
                    <div key={category}>
                      <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {category} ({categoryItems.length})
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {categoryItems.map((item) => {
                          const globalIdx = flatItems.findIndex((x) => x.id === item.id);
                          const isSelected = globalIdx === selectedIndex;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => selectItem(item)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? "bg-blue-50 text-blue-900 font-medium"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${
                                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Icon name={item.icon} className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-semibold">{item.title}</p>
                                  {item.badge && (
                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : !loading ? (
            <div className="p-6 text-center text-slate-500">
              <Icon name="search" className="mx-auto mb-2 size-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                No se encontraron resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Intenta buscar por código de orden, nombre de cliente, motor o repuesto.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/admin/work-orders?search=${encodeURIComponent(query.trim())}`);
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
              >
                Buscar en Órdenes de Trabajo &rarr;
              </button>
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 px-3 pt-2 text-[11px] text-slate-400">
            <span>↑↓ Navegar · Enter Seleccionar · Esc Cerrar</span>
            <span>Búsqueda global</span>
          </div>
        </div>
      )}
    </div>
  );
}
