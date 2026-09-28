"use client";

import { useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/utils/error-message";

export const useDebouncedValue = <T,>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
};

export function useReportResource<T>(requestKey: string | null, loader: () => Promise<T>) {
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  const requestId = useRef(0);
  const [state, setState] = useState<{ data: T | null; loadedKey: string | null; error: string; loading: boolean }>({
    data: null, loadedKey: null, error: "", loading: requestKey !== null
  });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (requestKey === null) return;
    const currentRequest = ++requestId.current;
    setState((current) => ({ ...current, error: "", loading: true }));
    void loaderRef.current()
      .then((data) => {
        if (requestId.current === currentRequest) setState({ data, loadedKey: requestKey, error: "", loading: false });
      })
      .catch((error: unknown) => {
        if (requestId.current === currentRequest) {
          setState({ data: null, loadedKey: requestKey, error: getErrorMessage(error), loading: false });
        }
      });
    return () => { requestId.current += 1; };
  }, [requestKey, retryToken]);

  const current = state.loadedKey === requestKey;
  return {
    data: current ? state.data : null,
    loading: requestKey !== null && (state.loading || !current),
    error: current ? state.error : "",
    retry: () => setRetryToken((value) => value + 1)
  };
}

