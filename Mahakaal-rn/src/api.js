// Mahakaal-rn/src/api.js
import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --------------------------------------------------
// Safe storage helpers (web friendly)
// --------------------------------------------------
const storage = {
  getItem: async (k) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const v = window.localStorage.getItem(k);
        if (v != null) return v;
      }
      return await AsyncStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: async (k, v) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.localStorage.setItem(k, v);
        return;
      }
      await AsyncStorage.setItem(k, v);
    } catch {}
  },
  removeMany: async (keys) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        keys.forEach((k) => window.localStorage.removeItem(k));
        return;
      }
      await AsyncStorage.multiRemove(keys);
    } catch {}
  },
};

// --------------------------------------------------
// Base URL resolution (android emulator + real phone + web + ios)
// --------------------------------------------------
const ENV_URL =
  (typeof process !== "undefined" &&
    process?.env?.EXPO_PUBLIC_API_URL &&
    String(process.env.EXPO_PUBLIC_API_URL)) ||
  "";

// ✅ WEB: use current hostname so it works on LAN/IP too
const WEB_URL =
  typeof window !== "undefined" && window?.location?.hostname
    ? `http://${window.location.hostname}:8000`
    : "";

/**
 * ✅ IMPORTANT:
 * Prefer EXPO_PUBLIC_API_URL in .env
 * Example (Render): EXPO_PUBLIC_API_URL=https://mahakaal-0aqy.onrender.com
 */
const DEV_PC_IP = "192.168.1.5"; // 🔁 only for local backend use (ipconfig)
const REAL_DEVICE_URL = `http://${DEV_PC_IP}:8000`;

// ✅ Render fallback (so real phone never hits localhost / LAN by mistake)
const RENDER_FALLBACK = "https://mahakaal-0aqy.onrender.com";

// ✅ Best default per platform
const DEFAULT_URL =
  Platform.OS === "android"
    ? "" // ✅ android MUST use ENV_URL (or fallback below), never force LAN ip
    : "http://localhost:8000"; // iOS simulator + fallback

// Prefer: ENV_URL > WEB_URL > (android: render fallback) > DEFAULT_URL > REAL_DEVICE_URL (last)
const BASE_URL = (
  ENV_URL ||
  WEB_URL ||
  (Platform.OS === "android" ? RENDER_FALLBACK : "") ||
  DEFAULT_URL ||
  REAL_DEVICE_URL
)
  .trim()
  .replace(/\/+$/, "");

// ✅ Backend mounts: /api/*
const API_BASE = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const BASE_URL_PUBLIC = BASE_URL;
export const API_BASE_URL = API_BASE;

// --------------------------------------------------
// Attach token automatically
// --------------------------------------------------
api.interceptors.request.use(async (cfg) => {
  try {
    const token = await storage.getItem("token");
    if (token) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return cfg;
});

// --------------------------------------------------
// Debug response (helps catch 401/404 silently)
// --------------------------------------------------
api.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const url = err?.config?.baseURL + (err?.config?.url || "");
      console.log("[API ERROR]", status, url, data || err?.message);
    } catch {}
    return Promise.reject(err);
  }
);

// --------------------------------------------------
// Session helpers
// --------------------------------------------------
export async function saveSession({ token, user } = {}) {
  try {
    if (token) {
      await storage.setItem("token", token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    if (user) {
      await storage.setItem("user", JSON.stringify(user));
    }
  } catch {}
}

export async function getUser() {
  try {
    const raw = await storage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  try {
    await storage.removeMany(["token", "user"]);
    delete api.defaults.headers.common.Authorization;
  } catch {}
}

// --------------------------------------------------
// API methods (ALL relative to /api)
// --------------------------------------------------
export const API = {
  // auth
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),

  // ✅ FIXED: /me is under /api/auth/me in backend
  me: () => api.get("/auth/me"),

  // user
  wallet: () => api.get("/wallet"),
  transactions: () => api.get("/transactions"),

  // ✅ FIXED: user app should NOT fetch inactive games
  games: () => api.get("/games"),

  // bets
  placeBet: (payload) => api.post("/bets", payload),
  myBets: () => api.get("/bets"),
  todayBets: () => api.get("/bets/today"),

  // compat aliases
  bets: (params = {}) => api.get("/bets", { params }),
  history: (days = 30) => api.get("/bets", { params: { days } }),
  betHistory: (days = 30) => api.get("/bets", { params: { days } }),
  slips: (params = {}) => api.get("/bets", { params }),

  // results
  results: (params = {}) => api.get("/results", { params }),
  todayResults: (params = {}) => api.get("/results/today", { params }),

  // ✅ ResultHistoryScreen helpers
  resultsRange: (from, to) =>
    api.get("/results", { params: { from, to, limit: 500 } }),
  resultsMonth: (year, month) => {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return api.get("/results", { params: { from, to, limit: 500 } });
  },
  resultsLatest: (limit = 60) =>
    api.get("/results", { params: { limit } }),

  // payment requests
  paymentRequestCreate: (payload) => api.post("/payment-requests", payload),
  paymentRequestMy: () => api.get("/payment-requests/my"),
  paymentRequests: () => api.get("/payment-requests/my"),
  walletRequests: () => api.get("/payment-requests/my"),
  payments: () => api.get("/transactions"),

  // commission
  commissionSummary: (params = {}) => api.get("/commission/summary", { params }),
  getCommissionSummary: (params = {}) => api.get("/commission/summary", { params }),

  // winnings
  winnings: (params = {}) => api.get("/winnings", { params }),
  betsWins: (params = {}) => api.get("/bets", { params: { status: "won", ...params } }),
};

export default api;
