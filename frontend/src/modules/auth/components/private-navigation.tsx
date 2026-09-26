"use client";

import Link from "next/link";
import { useEffect, useId, useState, type PropsWithChildren, type ReactNode } from "react";
import type { AppUser } from "@/shared/models/admin";
import { Icon, type IconName } from "@/shared/components/icon";

export type PrivateNavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

type PrivateNavigationProps = PropsWithChildren<{
  pathname: string;
  user: AppUser;
  title: string;
  roleLabel: string;
  drawerLabel: string;
  navigation: readonly PrivateNavigationItem[];
  onSignOut: () => void | Promise<void>;
  brandIcon?: IconName;
  desktopHeaderContent?: ReactNode;
}>;

function isActive(pathname: string, item: PrivateNavigationItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PrivateNavigation({
  children,
  pathname,
  user,
  title,
  roleLabel,
  drawerLabel,
  navigation,
  onSignOut,
  brandIcon = "settings",
  desktopHeaderContent
}: PrivateNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const signOut = () => {
    closeMenu();
    void onSignOut();
  };

  const navigationLinks = (onNavigate?: () => void) =>
    navigation.map((item) => {
      const active = isActive(pathname, item);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition ${
            active
              ? "border-blue-500 bg-white/15 font-bold text-white"
              : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col bg-[#16324f] py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-blue-700">
            <Icon name={brandIcon} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Motor Repair</p>
            <p className="text-xs text-slate-300">{roleLabel}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label={`Navegación de ${roleLabel.toLowerCase()}`}>
          {navigationLinks()}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="mx-4 flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" />
          Cerrar sesión
        </button>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/45"
            onClick={closeMenu}
          />
          <aside
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={drawerLabel}
            className="relative flex h-full w-[min(85vw,320px)] flex-col bg-[#16324f] py-6 shadow-2xl"
          >
            <div className="mb-7 flex items-center justify-between gap-4 px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-blue-700">
                  <Icon name={brandIcon} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-white">Motor Repair</p>
                  <p className="truncate text-xs text-slate-300">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={closeMenu}
                className="rounded-md p-2 text-slate-200 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icon name="close" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label={`Navegación de ${roleLabel.toLowerCase()}`}>
              {navigationLinks(closeMenu)}
            </nav>
            <div className="mt-5 border-t border-white/15 px-4 pt-4">
              <p className="truncate px-1 text-sm font-semibold text-white">{user.fullName}</p>
              <p className="mb-3 px-1 text-xs text-slate-300">{roleLabel}</p>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Icon name="logout" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 shadow-sm sm:px-5 lg:left-[260px]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls={drawerId}
            onClick={() => setMenuOpen(true)}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
          >
            <Icon name="menu" />
          </button>
          <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
        </div>
        {desktopHeaderContent}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden max-w-48 truncate text-right text-sm sm:block">
            <strong className="block truncate text-slate-800">{user.fullName}</strong>
            <small className="text-slate-500">{roleLabel}</small>
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white" aria-hidden="true">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="min-h-screen min-w-0 overflow-x-hidden p-5 pt-24 sm:p-6 sm:pt-24 lg:ml-[260px]">{children}</main>
    </div>
  );
}
