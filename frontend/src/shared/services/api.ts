"use client";

import { getSupabase } from "./supabase";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); }
}

const getToken = async (): Promise<string | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await getToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message ?? "No fue posible completar la solicitud", response.status, body.code);
  return body as T;
};

export const apiBaseUrl = baseUrl;
