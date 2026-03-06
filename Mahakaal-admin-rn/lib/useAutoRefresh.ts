// lib/useAutoRefresh.ts
// Refetches on focus + polls at interval for real-time sync with backend
import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

type FetchFn = () => Promise<void>;

interface Options {
  intervalMs?: number;
  refetchOnFocus?: boolean;
}

/**
 * Refetch on screen focus and poll at interval for real-time data sync
 */
export function useAutoRefresh(fetchFn: FetchFn, options: Options = {}) {
  const { intervalMs = 15000, refetchOnFocus = true } = options;
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  const doFetch = useCallback(() => {
    const f = fnRef.current;
    if (typeof f === "function") f().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus) doFetch();
      if (!intervalMs || intervalMs < 1000) return;
      const id = setInterval(doFetch, intervalMs);
      return () => clearInterval(id);
    }, [doFetch, intervalMs, refetchOnFocus])
  );
}
