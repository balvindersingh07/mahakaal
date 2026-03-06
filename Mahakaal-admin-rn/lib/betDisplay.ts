// lib/betDisplay.ts
// Shared helpers for displaying bet type and number across admin screens
// (games-history, wins, bet-report, etc.)

/** Bet type label: Jantri, Crossing, No To No, Andar, Bahar */
export function pickBetType(b: any): string {
  const raw = String(b?.betType || b?.type || "").toLowerCase().replace(/_/g, "-");
  if (raw === "no-to-no" || raw === "notono" || raw === "no2no") return "No To No";
  if (raw === "crossing") return "Crossing";
  if (raw === "jantri" || raw === "num" || raw === "number") return "Jantri";
  if (raw === "andar") return "Andar";
  if (raw === "bahar") return "Bahar";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Jantri";
}

/**
 * Number from items[]:
 * - 1 item -> key/num
 * - multiple no-to-no (consecutive) -> range e.g. "31-34"
 * - multiple other -> "31, 32, 33 +1"
 */
export function pickNumber(b: any): string {
  const items = Array.isArray(b?.items) ? b.items : [];
  if (items.length === 0) return b?.resultValue || "-";
  const type = String(b?.betType || items[0]?.type || "").toLowerCase().replace(/_/g, "-");
  if (items.length === 1) {
    const it = items[0] || {};
    return String(it?.key || it?.num || "-");
  }
  if (items.length > 1) {
    const nums = items
      .map((it: any) => {
        const v = it?.key || it?.num || "";
        return /^\d+$/.test(String(v)) ? parseInt(v, 10) : null;
      })
      .filter((n: number | null): n is number => n != null);
    const isNoToNo = type === "no-to-no" || type === "notono";
    if (isNoToNo && nums.length > 0) {
      nums.sort((a: number, b: number) => a - b);
      const min = nums[0];
      const max = nums[nums.length - 1];
      const expected = max - min + 1;
      if (nums.length === expected && nums.every((n: number, i: number) => n === min + i)) {
        const pad = (x: number) => String(x).padStart(2, "0");
        return `${pad(min)}-${pad(max)}`;
      }
    }
    const first = items
      .slice(0, 3)
      .map((it: any) => String(it?.key || it?.num || "-"))
      .join(", ");
    return items.length <= 3 ? first : `${first} +${items.length - 3}`;
  }
  return "-";
}

export function pickGame(b: any): string {
  return String(b?.gameName || b?.gameId || "-");
}

export function pickAmount(b: any): number {
  return Number(b?.total || 0);
}
