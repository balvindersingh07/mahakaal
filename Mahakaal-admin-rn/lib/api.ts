// app/lib/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

type AnyObj = Record<string, any>;
type ReqInit = Omit<RequestInit, "body"> & { body?: any };

/** Resolve base API URL from env or fall back to Render (NOT localhost for phone/Expo Go) */
export const BASE = (
  (process.env.EXPO_PUBLIC_API_URL ?? "https://mahakaal-0aqy.onrender.com") as string
)
  .trim()
  .replace(/\/+$/, "");

console.log("[api] BASE =", BASE);

// ---------------- Token store (memory) ----------------
let ADMIN_TOKEN: string | null = null;
let USER_TOKEN: string | null = null;

// ✅ Storage keys (STRICT)
export const ADMIN_KEY = "ADMIN_TOKEN"; // ✅ ONLY admin token key (final)
export const USER_KEY = "token";        // user app compatibility

// ⚠️ Legacy keys (older builds)
const LEGACY_ADMIN_KEY = "adminToken";  // old admin key used in _layout/login earlier

/** Internal: set in-memory only (no storage) */
export const setAdminToken = (t: string | null) => { ADMIN_TOKEN = t; };
export const getAdminToken = () => ADMIN_TOKEN;
export const clearAdminToken = () => { ADMIN_TOKEN = null; };

export const setUserToken = (t: string | null) => { USER_TOKEN = t; };
export const getUserToken = () => USER_TOKEN;
export const clearUserToken = () => { USER_TOKEN = null; };

/**
 * ✅ Load tokens from AsyncStorage into memory (call once on app start)
 * Also migrates legacy adminToken -> ADMIN_TOKEN (so older installs stop auto-skipping login wrongly)
 */
export async function loadTokensFromStorage() {
  try {
    // admin
    const adminNew = await AsyncStorage.getItem(ADMIN_KEY);
    const adminOld = adminNew ? null : await AsyncStorage.getItem(LEGACY_ADMIN_KEY);

    const finalAdmin = adminNew || adminOld || null;

    // migrate legacy -> new
    if (!adminNew && adminOld) {
      await AsyncStorage.setItem(ADMIN_KEY, adminOld);
      await AsyncStorage.removeItem(LEGACY_ADMIN_KEY);
      console.log("[api] migrated legacy adminToken -> ADMIN_TOKEN");
    }

    // user
    const userTok = await AsyncStorage.getItem(USER_KEY);

    ADMIN_TOKEN = finalAdmin;
    USER_TOKEN = userTok || null;

    console.log("[api] tokens loaded", { admin: !!ADMIN_TOKEN, user: !!USER_TOKEN });
  } catch (e) {
    console.log("[api] token load failed", String((e as any)?.message || e));
  }
}

/** ✅ Admin token: set + persist (never touches USER_KEY) */
export async function persistAdminToken(t: string | null) {
  ADMIN_TOKEN = t;
  try {
    if (t) await AsyncStorage.setItem(ADMIN_KEY, t);
    else await AsyncStorage.removeItem(ADMIN_KEY);

    // cleanup legacy always
    await AsyncStorage.removeItem(LEGACY_ADMIN_KEY);
  } catch {}
}

/** ✅ User token: set + persist (never touches ADMIN_KEY) */
export async function persistUserToken(t: string | null) {
  USER_TOKEN = t;
  try {
    if (t) await AsyncStorage.setItem(USER_KEY, t);
    else await AsyncStorage.removeItem(USER_KEY);
  } catch {}
}

/**
 * ✅ Hard logout helpers
 * - clears only admin auth (admin app)
 * - also clears legacy key so login can't be skipped
 */
export async function clearAdminSession() {
  ADMIN_TOKEN = null;
  try {
    await AsyncStorage.multiRemove([ADMIN_KEY, LEGACY_ADMIN_KEY]);
  } catch {}
}

/**
 * Optional: if in admin app you want "full reset" (admin + user token)
 * (Use only if needed)
 */
export async function clearAllTokens() {
  ADMIN_TOKEN = null;
  USER_TOKEN = null;
  try {
    await AsyncStorage.multiRemove([ADMIN_KEY, LEGACY_ADMIN_KEY, USER_KEY]);
  } catch {}
}

// Decide which token to attach for a given API path
function tokenForPath(path: string) {
  const p = String(path || "");

  // admin endpoints
  const isAdmin =
    p.startsWith("/api/admin") ||
    p.startsWith("/admin") ||
    p.includes("/api/admin/") ||
    p.includes("/admin/");

  return isAdmin ? ADMIN_TOKEN : USER_TOKEN;
}

// Inject Authorization when needed (auto-pick admin/user token by path)
function addAuth(path: string, init?: ReqInit): ReqInit {
  const headers: AnyObj = { Accept: "application/json", ...(init?.headers as any) };
  const tok = tokenForPath(path);
  if (tok) headers.Authorization = `Bearer ${tok}`;
  return { ...(init || {}), headers };
}

// Single request with safe JSON parsing & helpful logs
async function request(path: string, init?: ReqInit, auth = false) {
  const cfg: ReqInit = auth
    ? addAuth(path, init)
    : ({ Accept: "application/json", ...(init || {}) } as ReqInit);

  const method = (cfg.method ?? "GET").toString().toUpperCase();

  // Ensure JSON body for non-GET/HEAD
  if (method !== "GET" && method !== "HEAD") {
    cfg.headers = { "Content-Type": "application/json", ...(cfg.headers as any) };
    if (cfg.body != null && typeof cfg.body !== "string") cfg.body = JSON.stringify(cfg.body);
  }

  const url = `${BASE}${path}`;
  console.log("[api] →", method, url);

  const res = await fetch(url, cfg as RequestInit);

  let raw = "";
  try { raw = await res.text(); } catch {}

  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

  console.log(
    "[api] ←",
    res.status,
    method,
    url,
    typeof data === "string" ? data.slice(0, 200) : data
  );

  if (!res.ok) {
    const msg = (data as any)?.error || (data as any)?.message || `${res.status} ${res.statusText}`;
    throw new Error(String(msg));
  }

  return data as any;
}

// Try multiple path variants until one works
async function tryRequest(paths: string[], init?: ReqInit, auth = false) {
  let lastErr: any;
  for (const p of paths) {
    try { return await request(p, init, auth); }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// Helper to build common variant list for “id”
function idVariants(id: string | number) {
  const s = String(id);
  return {
    path: [
      `/api/admin/users/${s}`,
      `/admin/users/${s}`,
      `/api/admin/user/${s}`,
      `/admin/user/${s}`,
    ],
    qs: [
      `/api/admin/users?id=${encodeURIComponent(s)}`,
      `/admin/users?id=${encodeURIComponent(s)}`,
      `/api/admin/user?id=${encodeURIComponent(s)}`,
      `/admin/user?id=${encodeURIComponent(s)}`,
    ],
  };
}

// ---------------- Public API surface ----------------
export const api = {
  /** Generic helpers (auth-aware, auto picks admin/user token by path) */
  get: (p: string, init?: ReqInit) =>
    tryRequest([p], { ...(init || {}), method: "GET" }, true),

  post: (p: string, body?: any, init?: ReqInit) =>
    tryRequest([p], { ...(init || {}), method: "POST", body }, true),

  /** Health */
  health: () => tryRequest(["/health", "/api/health"], { method: "GET" }, false),

  /** USER ME */
  me: () => tryRequest(["/api/auth/me", "/auth/me"], { method: "GET" }, true),

  /** ADMIN AUTH */
  adminLogin: (password: string) =>
    tryRequest(["/api/admin/login", "/admin/login"], { method: "POST", body: { password } }, false),

  // compatibility
  login: (body: AnyObj) =>
    tryRequest(["/api/admin/login", "/admin/login", "/api/login"], { method: "POST", body }, false),

  /** Admin data */
  users: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return tryRequest([`/api/admin/users${qs}`, `/admin/users${qs}`], { method: "GET" }, true);
  },

  games: () =>
    tryRequest(["/api/games?all=1", "/games?all=1", "/api/games", "/games"], { method: "GET" }, true),

  bets: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return tryRequest([`/api/admin/bets${qs}`, `/admin/bets${qs}`], { method: "GET" }, true);
  },

  ledger: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return tryRequest([`/api/admin/ledger${qs}`, `/admin/ledger${qs}`], { method: "GET" }, true);
  },

  userSummary: (id: string | number) =>
    tryRequest([`/api/admin/user/${id}/summary`, `/admin/user/${id}/summary`], { method: "GET" }, true),

  betReport: (gameId: string, fromISO: string, toISO: string) => {
    const qs = `?${new URLSearchParams({ gameId, from: fromISO, to: toISO }).toString()}`;
    return tryRequest(
      [`/api/admin/bet-report${qs}`, `/admin/bet-report${qs}`, `/api/bet-report${qs}`, `/bet-report${qs}`],
      { method: "GET" },
      true
    );
  },

  combinedShow: () =>
    tryRequest(
      ["/api/admin/combined", "/admin/combined", "/api/reports/combined", "/reports/combined"],
      { method: "GET" },
      true
    ),

  /** Referral / commission configuration (admin) */
  referralConfig: () =>
    tryRequest(
      ["/api/admin/referral-config", "/admin/referral-config"],
      { method: "GET" },
      true
    ),

  saveReferralConfig: (body: AnyObj) =>
    tryRequest(
      ["/api/admin/referral-config", "/admin/referral-config"],
      { method: "POST", body },
      true
    ),

  resultsList: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return tryRequest([`/api/admin/results${qs}`, `/admin/results${qs}`], { method: "GET" }, true);
  },

  resultsSet: (data: AnyObj) =>
    tryRequest(["/api/admin/results", "/admin/results"], { method: "POST", body: data }, true),

  paymentRequests: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return tryRequest(
      [`/api/admin/payment-requests${qs}`, `/admin/payment-requests${qs}`],
      { method: "GET" },
      true
    );
  },

  approvePayment: (id: string, body?: AnyObj) =>
    tryRequest(
      [`/api/admin/payment-requests/${id}/approve`, `/admin/payment-requests/${id}/approve`],
      { method: "POST", body: body || {} },
      true
    ),

  rejectPayment: (id: string, body?: AnyObj) =>
    tryRequest(
      [`/api/admin/payment-requests/${id}/reject`, `/admin/payment-requests/${id}/reject`],
      { method: "POST", body: body || {} },
      true
    ),

  markPaidPayment: (id: string, body?: AnyObj) =>
    tryRequest(
      [`/api/admin/payment-requests/${id}/mark-paid`, `/admin/payment-requests/${id}/mark-paid`],
      { method: "POST", body: body || {} },
      true
    ),

  deletePaymentRequest: (id: string) =>
    tryRequest([`/api/admin/payment-requests/${id}`, `/admin/payment-requests/${id}`], { method: "DELETE" }, true),

  deleteResult: (id: string) =>
    tryRequest([`/api/admin/results/${id}`, `/admin/results/${id}`], { method: "DELETE" }, true),

  createPaymentRequest: (body: AnyObj) =>
    tryRequest(["/api/payment-requests", "/payment-requests"], { method: "POST", body }, true),

  myPaymentRequests: () =>
    tryRequest(["/api/payment-requests/my", "/payment-requests/my"], { method: "GET" }, true),

  settle: (gameId: string) =>
    tryRequest(["/api/admin/settle", "/admin/settle"], { method: "POST", body: { gameId } }, true),

  adminScanners: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return tryRequest(
      [`/api/admin/scanners${qs}`, `/admin/scanners${qs}`],
      { method: "GET" },
      true
    );
  },

  adminUploadImage: (base64: string) =>
    tryRequest(
      ["/api/admin/upload-image", "/admin/upload-image"],
      { method: "POST", body: { image: base64 } },
      true
    ),

  adminSaveScanner: (body: AnyObj) =>
    tryRequest(
      ["/api/admin/scanners", "/admin/scanners"],
      { method: "POST", body },
      true
    ),

  adminDeleteScanner: (id: string) =>
    tryRequest(
      [`/api/admin/scanners/${id}`, `/admin/scanners/${id}`],
      { method: "DELETE" },
      true
    ),

  walletAdd: (userIdOrPhone: string | number, amount: number, note?: string) =>
    tryRequest(
      ["/api/admin/wallet/add", "/admin/wallet/add"],
      { method: "POST", body: { userId: userIdOrPhone, phone: String(userIdOrPhone), amount, note } },
      true
    ),

  walletWithdraw: (userIdOrPhone: string | number, amount: number, note?: string) =>
    tryRequest(
      ["/api/admin/wallet/withdraw", "/admin/wallet/withdraw"],
      { method: "POST", body: { userId: userIdOrPhone, phone: String(userIdOrPhone), amount, note } },
      true
    ),

  userSetPassword: (body: AnyObj) =>
    tryRequest(
      ["/api/admin/users/password", "/admin/users/password", "/api/admin/user/password", "/admin/user/password"],
      { method: "POST", body },
      true
    ),

  userBlock: (id: string | number, block: boolean) => {
    const v = idVariants(id);
    const body = { id, userId: id, phone: String(id), block, status: block ? "Blocked" : "Active" };

    return tryRequest(
      [
        ...v.path.map((p) => `${p}/${block ? "block" : "unblock"}`),
        "/api/admin/users/block",
        "/admin/users/block",
        "/api/admin/user/block",
        "/admin/user/block",
        "/api/admin/users/status",
        "/admin/users/status",
        ...v.qs.map((p) => `${p}&action=${block ? "block" : "unblock"}`),
      ],
      { method: "POST", body },
      true
    );
  },

  userDelete: (id: string | number) => {
    const v = idVariants(id);

    return tryRequest([...v.path], { method: "DELETE" }, true).catch(() =>
      tryRequest(
        [
          "/api/admin/users/delete",
          "/admin/users/delete",
          "/api/admin/user/delete",
          "/admin/user/delete",
          ...v.qs,
        ],
        { method: "POST", body: { id, userId: id, phone: String(id) } },
        true
      )
    );
  },
};
