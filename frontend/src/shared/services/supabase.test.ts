import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getTabId,
  getStorageKey,
  clearTabSession,
  getSupabase,
  resetSupabaseClientForTesting
} from "./supabase";

describe("Multi-tab isolated auth service (supabase.ts)", () => {
  const originalWindowName = typeof window !== "undefined" ? window.name : "";

  beforeEach(() => {
    resetSupabaseClientForTesting();
    if (typeof window !== "undefined") {
      window.sessionStorage?.clear?.();
      window.localStorage?.clear?.();
      window.name = "";
    }
  });

  afterEach(() => {
    resetSupabaseClientForTesting();
    if (typeof window !== "undefined") {
      window.name = originalWindowName;
    }
  });

  it("generates a new unique tab ID when window.name is empty", () => {
    const tabId = getTabId();
    expect(tabId).toMatch(/^mr_tab_/);
    expect(window.name).toBe(tabId);
  });

  it("preserves tab ID on reload when window.name is already set", () => {
    window.name = "mr_tab_test_12345";
    const tabId = getTabId();
    expect(tabId).toBe("mr_tab_test_12345");
  });

  it("produces distinct storage keys for distinct tabs", () => {
    const key1 = getStorageKey("mr_tab_111");
    const key2 = getStorageKey("mr_tab_222");

    expect(key1).not.toBe(key2);
    expect(key1).toBe("mr_auth_mr_tab_111");
    expect(key2).toBe("mr_auth_mr_tab_222");
  });

  it("clears all mr_auth session items when clearTabSession is called", () => {
    window.sessionStorage.setItem("mr_auth_mr_tab_111", JSON.stringify({ token: "abc" }));
    window.sessionStorage.setItem("mr_auth_mr_tab_222", JSON.stringify({ token: "xyz" }));
    window.sessionStorage.setItem("other_key", "keep_me");

    clearTabSession();

    expect(window.sessionStorage.getItem("mr_auth_mr_tab_111")).toBeNull();
    expect(window.sessionStorage.getItem("mr_auth_mr_tab_222")).toBeNull();
    expect(window.sessionStorage.getItem("other_key")).toBe("keep_me");
  });

  it("creates a client instance configured with the tab's storageKey", () => {
    window.name = "mr_tab_unit_test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const client = getSupabase();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });
});

