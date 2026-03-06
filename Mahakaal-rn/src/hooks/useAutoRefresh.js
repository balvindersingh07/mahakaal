// src/hooks/useAutoRefresh.js
// Refetches on focus + polls at interval for real-time data sync with backend
import { useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * @param {() => Promise<void>} fetchFn - async function to refetch data
 * @param {Object} options
 * @param {number} [options.intervalMs=15000] - poll interval when focused (0 = no polling)
 * @param {boolean} [options.refetchOnFocus=true] - refetch when screen gains focus
 */
export function useAutoRefresh(fetchFn, options = {}) {
  const { intervalMs = 15000, refetchOnFocus = true } = options;
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  const doFetch = useCallback(() => {
    const f = fnRef.current;
    if (typeof f !== "function") return;
    const p = f();
    Promise.resolve(p).catch(() => {});
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
