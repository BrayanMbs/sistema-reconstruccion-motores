"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/utils/error-message";
import type { AppSettings } from "../models/settings";
import { settingsService } from "../services/settings.service";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void settingsService.get()
      .then((data) => { if (active) setSettings(data); })
      .catch((caught: unknown) => { if (active) setError(getErrorMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadToken]);

  // Bloquea un segundo guardado aunque llegue antes de que el botón se deshabilite en pantalla.
  const save = useCallback(async (next: AppSettings): Promise<AppSettings | null> => {
    if (savingRef.current) return null;
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await settingsService.save(next);
      setSettings(saved);
      return saved;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { settings, loading, error, saving, save, reload };
}
