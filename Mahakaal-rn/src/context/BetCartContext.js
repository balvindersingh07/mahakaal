// src/context/BetCartContext.js
// Shared betting cart: accumulates selections from Jantri, Crossing, No To No
// before a single Play action.
import React, { createContext, useContext, useReducer, useCallback } from "react";

const CART_KEY = "betCart";

const initialState = {
  gameId: "",
  gameName: "",
  start: "",
  end: "",
  items: [],
};

function cartReducer(state, action) {
  switch (action.type) {
    case "SET_GAME":
      {
        const next = { ...state };
        const gid = String((action.payload.gameId ?? state.gameId) || "");
        const gname = action.payload.gameName ?? state.gameName;
        const st = action.payload.start ?? state.start;
        const en = action.payload.end ?? state.end;
        const prevId = String(state.gameId || "");
        const gameChanged = prevId && gid && prevId !== gid;
        return {
          ...next,
          gameId: gid,
          gameName: gname,
          start: st,
          end: en,
          items: gameChanged ? [] : next.items,
        };
      }
    case "CLEAR":
      return { ...state, items: [] };
    case "RESET_GAME":
      return { ...initialState };
    case "ADD_ITEMS":
      {
        const next = { ...state };
        const incoming = action.payload;
        const ids = new Set(next.items.map((i) => i.id));
        for (const it of incoming) {
          if (it.id && !ids.has(it.id)) {
            next.items.push(it);
            ids.add(it.id);
          }
        }
        return next;
      }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload),
      };
    case "SET_ITEMS_FOR_TYPE":
      {
        const { betType, items } = action.payload;
        const rest = state.items.filter((i) => i.betType !== betType);
        return { ...state, items: [...rest, ...items] };
      }
    default:
      return state;
  }
}

const BetCartContext = createContext(null);

export function BetCartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const setGame = useCallback((params) => {
    dispatch({
      type: "SET_GAME",
      payload: {
        gameId: params?.gameId ?? "",
        gameName: params?.gameName ?? "",
        start: params?.start ?? "",
        end: params?.end ?? "",
      },
    });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET_GAME" });
  }, []);

  const addItems = useCallback((items) => {
    dispatch({ type: "ADD_ITEMS", payload: items });
  }, []);

  const removeItem = useCallback((id) => {
    dispatch({ type: "REMOVE_ITEM", payload: id });
  }, []);

  const setItemsForType = useCallback((betType, items) => {
    dispatch({ type: "SET_ITEMS_FOR_TYPE", payload: { betType, items } });
  }, []);

  const total = state.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const count = state.items.length;

  const value = {
    ...state,
    total,
    count,
    setGame,
    clearCart,
    resetGame,
    addItems,
    removeItem,
    setItemsForType,
  };

  return (
    <BetCartContext.Provider value={value}>
      {children}
    </BetCartContext.Provider>
  );
}

export function useBetCart() {
  const ctx = useContext(BetCartContext);
  if (!ctx) {
    throw new Error("useBetCart must be used within BetCartProvider");
  }
  return ctx;
}
