"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiGet } from "@/lib/api-client";

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  /** Replace the data in place (e.g. with a server response after a mutation). */
  setData: (data: T) => void;
}

/**
 * Fetch JSON from `url` (null = don't fetch). Aborts the previous request when the
 * URL changes, so switching students quickly never shows stale data.
 */
export function useApi<T>(url: string | null): ApiState<T> {
  const [state, setState] = useState<{ url: string | null; data: T | null; error: ApiError | null }>({
    url: null,
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    apiGet<T>(url, controller.signal).then(
      (data) => setState({ url, data, error: null }),
      (err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        const error = err instanceof ApiError ? err : new ApiError(0, "unknown", "Something went wrong.");
        setState({ url, data: null, error });
      },
    );
    return () => controller.abort();
  }, [url, attempt]);

  // After an error, retry shows the loading state. With data on screen, refetch in
  // the background and keep showing it (no flash back to a skeleton).
  const reload = useCallback(() => {
    setState((s) => (s.error ? { ...s, url: null, error: null } : s));
    setAttempt((a) => a + 1);
  }, []);
  const setData = useCallback((data: T) => setState((s) => ({ ...s, data, error: null })), []);

  // Results for an older URL are never shown as current.
  const current = state.url === url;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: Boolean(url) && !current,
    reload,
    setData,
  };
}
