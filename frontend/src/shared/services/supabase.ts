"use client";

import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

const TAB_STORAGE_PREFIX = "mr_auth_";

/**
 * Obtiene o inicializa un identificador único para la pestaña actual.
 * Utiliza `window.name` ya que por especificación W3C:
 * 1. Persiste ante recargas de página (F5) y navegaciones internas.
 * 2. Se inicializa vacío ("") al abrir una nueva pestaña limpia o ventana independiente.
 */
export const getTabId = (): string => {
  if (typeof window === "undefined") return "server";

  try {
    if (window.name && window.name.startsWith("mr_tab_")) {
      return window.name;
    }
    const newTabId = "mr_tab_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    window.name = newTabId;
    return newTabId;
  } catch {
    return "mr_tab_fallback";
  }
};

/**
 * Clave de almacenamiento aislada por pestaña.
 * Al ser única por pestaña, garantiza que:
 * 1. Cada pestaña tenga su propia sesión independiente en `sessionStorage`.
 * 2. Supabase asigne un `BroadcastChannel` aislado por pestaña, evitando que el login/logout
 *    de un usuario en una pestaña cierre o altere la sesión de otra pestaña abierta.
 */
export const getStorageKey = (tabId: string = getTabId()): string => {
  return `${TAB_STORAGE_PREFIX}${tabId}`;
};

/**
 * Limpia todas las credenciales de sesión almacenadas en la pestaña actual.
 */
export const clearTabSession = (): void => {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(TAB_STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Ignorar si sessionStorage está bloqueado
  }
};

/**
 * Adaptador de almacenamiento seguro por pestaña con clonación controlada y migración.
 */
const createTabStorage = (storageKey: string): SupportedStorage => {
  const inMemoryFallback: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      if (typeof window === "undefined") return null;

      try {
        // 1. Intentar leer de sessionStorage para la clave de esta pestaña
        const direct = window.sessionStorage.getItem(key);
        if (direct !== null) return direct;

        // Si la pestaña actual está en /login, no intentamos heredar para permitir un inicio limpio
        const isLoginPage = typeof window.location !== "undefined" && window.location.pathname === "/login";
        if (isLoginPage) {
          return inMemoryFallback[key] ?? null;
        }

        // 2. Si esta pestaña fue abierta desde otra pestaña (ej. enlace en nueva pestaña), heredar sesión
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith(TAB_STORAGE_PREFIX) && k !== key) {
            const inherited = window.sessionStorage.getItem(k);
            if (inherited) {
              window.sessionStorage.setItem(key, inherited);
              return inherited;
            }
          }
        }

        // 3. Migración retrocompatible para usuarios existentes que tenían sesión en localStorage
        if (typeof window.localStorage !== "undefined") {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.startsWith("sb-") || k.includes("auth-token"))) {
              const legacy = window.localStorage.getItem(k);
              if (legacy) {
                window.sessionStorage.setItem(key, legacy);
                return legacy;
              }
            }
          }
        }

        return inMemoryFallback[key] ?? null;
      } catch {
        return inMemoryFallback[key] ?? null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(key, value);
        }
      } catch {
        // Fallback en memoria si sessionStorage no está disponible
      }
      inMemoryFallback[key] = value;
    },
    removeItem: (key: string): void => {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(key);
          // Al cerrar sesión en esta pestaña, limpiar cualquier residuo de sesiones previas en esta misma pestaña
          clearTabSession();
        }
      } catch {
        // Fallback
      }
      delete inMemoryFallback[key];
    }
  };
};

export const getSupabase = (): SupabaseClient | null => {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    client = null;
    return null;
  }

  const tabId = getTabId();
  const storageKey = getStorageKey(tabId);
  const storage = createTabStorage(storageKey);

  client = createClient(url, key, {
    auth: {
      storage,
      storageKey,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return client;
};

/**
 * Permite reiniciar la instancia del cliente para pruebas automatizadas.
 */
export const resetSupabaseClientForTesting = (): void => {
  client = undefined;
};
