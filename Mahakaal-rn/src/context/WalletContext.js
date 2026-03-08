// src/context/WalletContext.js
// Global wallet balance - updates instantly when bet is placed or wallet changes
import React, { createContext, useContext, useState, useCallback } from "react";
import { API, getUser } from "../api";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [balance, setBalanceState] = useState(null); // null = not yet loaded

  const refreshBalance = useCallback(async () => {
    try {
      const u = await getUser();
      let bal = Number(u?.wallet ?? u?.balance ?? 0) || 0;

      try {
        const w = await API.wallet();
        const d = w?.data ?? w;
        const n = d?.balance ?? d?.wallet ?? d?.user?.wallet;
        if (Number.isFinite(n)) bal = n;
      } catch {}

      setBalanceState(bal);
      return bal;
    } catch {
      setBalanceState(0);
      return 0;
    }
  }, []);

  const setBalance = useCallback((val) => {
    const n = Number(val);
    setBalanceState(Number.isFinite(n) ? n : 0);
  }, []);

  const value = {
    balance: balance == null ? 0 : balance,
    balanceLoaded: balance != null,
    setBalance,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
