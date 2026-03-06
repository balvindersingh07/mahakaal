// app/lib/debugFetch.ts
// Logs every fetch request/response globally (web & native).
declare global { interface Window { __DEBUG_FETCH_INSTALLED__?: boolean } }

if (!(globalThis as any).__DEBUG_FETCH_INSTALLED__) {
  (globalThis as any).__DEBUG_FETCH_INSTALLED__ = true;

  const orig = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method || "GET").toUpperCase();
    const url = typeof input === "string" ? input : (input as any)?.url || "";
    const body =
      init?.body && typeof init.body !== "string" ? "[object]" : (init?.body || "");

    console.log(`[http] → ${method} ${url}`, body);

    try {
      const res = await orig(input as any, init);
      const ct = res.headers.get("content-type") || "";
      let preview: any = "";
      try {
        const clone = res.clone();
        const text = await clone.text();
        preview = ct.includes("json") ? JSON.parse(text) : text.slice(0, 500);
      } catch {}
      console.log(`[http] ← ${res.status} ${url}`, preview);
      return res;
    } catch (err) {
      console.log(`[http] ✖ ${method} ${url}`, err);
      throw err;
    }
  };
}
export {};
