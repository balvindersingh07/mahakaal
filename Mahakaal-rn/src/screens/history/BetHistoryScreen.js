// src/screens/history/BetHistoryScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../api";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { THEME } from "../../theme";

const APP_BG = THEME.bg;
const MAX_WIDTH = 720;

/* ---------------- helpers ---------------- */
const INR = (n) => `₹${(Number(n) || 0).toFixed(2)}`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAD = (x) => String(x).padStart(2, "0");

function fmtType(t) {
  const x = String(t || "").toLowerCase().replace(/_/g, "-");
  if (x === "num" || x === "number") return "Number";
  if (x === "andar") return "Andar";
  if (x === "bahar") return "Bahar";
  if (x === "crossing") return "Crossing";
  if (x === "no-to-no" || x === "notono" || x === "no_to_no") return "No To No";
  return String(t || "").toUpperCase();
}

function fmtTime(dateish) {
  const d = dateish instanceof Date ? dateish : new Date(dateish);
  if (isNaN(d.getTime())) return "";
  const day = PAD(d.getDate());
  const mon = MONTHS[d.getMonth()];
  let hr = d.getHours();
  const min = PAD(d.getMinutes());
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${day} ${mon}, ${hr}:${min} ${ampm}`;
}

const normalizeId = (x) => String(x || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** IST month range: 1st of current month 00:00 -> today 23:59 */
function monthRangeIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 330 * 60000);

  const start = new Date(ist);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(ist);
  end.setHours(23, 59, 59, 999);

  return { start, end, ist };
}

const fmtDMY = (d) => `${PAD(d.getDate())}-${PAD(d.getMonth() + 1)}-${d.getFullYear()}`;

/** Pick best date field from a bet object */
function getCreatedAt(b) {
  return b.createdAt || b.created_at || b.time || b.date || b.placedAt || b.submittedAt || null;
}

/** Extract best-guess game id/name */
function getGameId(b) {
  return b.gameId || b.game?.id || b.game_code || b.market || b.game || b.title || b.gameName || null;
}

/** Get items array from diverse shapes */
function getItems(b) {
  if (Array.isArray(b.items)) return b.items;
  if (Array.isArray(b.lines)) return b.lines;
  if (Array.isArray(b.selections)) return b.selections;
  if (Array.isArray(b.bets)) return b.bets;

  if (b.number && (b.amount || b.amt)) {
    return [{ type: b.type || "num", key: b.number, amount: b.amount || b.amt }];
  }
  return [];
}

/** Normalize one raw bet/slip -> { id, gameId, createdAt, items:[{type,key,amount}], total } */
function normalizeBet(b) {
  const id = String(b.id || b._id || b.slipId || b.ref || b.reference || b.txnId || "");
  const createdAt = getCreatedAt(b);
  const gameId = getGameId(b);
  const itemsRaw = getItems(b);

  const items = (itemsRaw || []).map((it) => {
    const rawType = it.type || it.kind || it.segment || it.category || b.betType || b.type || "num";
    const t = String(rawType || "").replace(/_/g, "-").toLowerCase() || "num";
    return {
    type: t === "no-to-no" ? "no-to-no" : t,
    key: it.key || it.num || it.number || it.label || it.value || "",
    amount: Number(it.amount ?? it.amt ?? it.stake ?? it.value ?? 0) || 0,
  };
  });

  const total =
    Number(
      b.total ??
        b.totalAmount ??
        b.sum ??
        b.stake ??
        items.reduce((s, x) => s + (Number(x.amount) || 0), 0)
    ) || 0;

  return { id, createdAt, gameId, items, total };
}

export default function BetHistoryScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hist, setHist] = useState([]);     // normalized slips
  const [games, setGames] = useState([]);   // for id→name mapping
  const [err, setErr] = useState("");

  const fetchAll = useCallback(async () => {
    setErr("");
    try {
      setLoading(true);

      const { start, end } = monthRangeIST();
      const startTs = start.getTime();
      const endTs = end.getTime();

      // ✅ PRIMARY: GET /api/bets
      let raw = [];
      try {
        const r = await API.myBets();
        const d = r?.data ?? r;

        raw =
          (Array.isArray(d?.items) && d.items) ||
          (Array.isArray(d?.rows) && d.rows) ||
          (Array.isArray(d?.bets) && d.bets) ||
          (Array.isArray(d?.data) && d.data) ||
          (Array.isArray(d) && d) ||
          [];
      } catch {
        raw = [];
      }

      const normalized = (raw || []).map(normalizeBet);

      // ✅ filter CURRENT MONTH only
      const filtered = normalized.filter((b) => {
        const dt = b.createdAt ? new Date(b.createdAt) : null;
        const ts = dt && !isNaN(dt.getTime()) ? dt.getTime() : 0;
        return ts >= startTs && ts <= endTs;
      });

      // load games for mapping name
      let g = [];
      try {
        const rG = await API.games?.();
        const list = rG?.data ?? rG ?? [];
        if (Array.isArray(list)) g = list;
        else if (Array.isArray(list?.data)) g = list.data;
        else if (Array.isArray(list?.games)) g = list.games;
      } catch {}

      setHist(filtered);
      setGames(g);
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load history"
      );
      setHist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useAutoRefresh(fetchAll, { intervalMs: 15000 });

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  // gameId → gameName
  const gameName = useMemo(() => {
    const map = new Map();
    (games || []).forEach((g) => {
      const id = normalizeId(g._id || g.id || g.name);
      map.set(id, g.name || g.id || g._id);
    });
    return (id) => map.get(normalizeId(id)) || String(id || "—");
  }, [games]);

  // flat rows (each item → separate row)
  const rows = useMemo(() => {
    const out = [];
    (hist || []).forEach((b) => {
      const when = b.createdAt ? new Date(b.createdAt) : new Date();
      const game = gameName(b.gameId);

      const items =
        b.items && b.items.length
          ? b.items
          : [{ type: b.type || "num", key: "-", amount: b.total || 0 }];

      items.forEach((it, idx) => {
        out.push({
          id: `${b.id || "SLIP"}-${idx}`,
          game,
          type: it.type,
          number: it.key,
          amount: Number(it.amount) || 0,
          time: fmtTime(when),
          ts: when.getTime(),
        });
      });
    });
    out.sort((a, b) => b.ts - a.ts);
    return out;
  }, [hist, gameName]);

  const totalStake = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows]
  );

  const { startText, endText } = useMemo(() => {
    const { start, ist } = monthRangeIST();
    return { startText: fmtDMY(start), endText: fmtDMY(ist) };
  }, []);

  const goPlay = () => {
    try { navigation.goBack(); } catch {}
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" />

      {/* Top dark header bar (safe-area included) - single back */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={goPlay} style={s.topbarBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.topbarTitle} numberOfLines={1}>
          🎯 This Month Bet History
        </Text>

        <View style={s.topbarBtns}>
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.85}
            style={s.refreshBtn}
          >
            <Text style={s.backTxt}>{refreshing || loading ? "Refreshing..." : "Refresh"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ centered frame */}
        <View style={s.frame}>
          <View style={s.card}>
            <View style={s.headingRow}>
              <Ionicons name="calendar-outline" size={22} color={THEME.primary} />
              <Text style={s.title}>
                Bet History ({startText} to {endText})
              </Text>
            </View>

            {/* Summary */}
            <View style={s.summary}>
              <Text style={s.sumText}>
                Entries: <Text style={s.sumBold}>{rows.length}</Text>
              </Text>
              <Text style={s.sumText}>
                Total Stake: <Text style={s.sumBold}>{INR(totalStake)}</Text>
              </Text>
            </View>

            {loading && (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            )}

            {/* ✅ Horizontal scroll table (fixes out-of-screen on phones) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.table}>
                <View style={[s.tr, s.thead]}>
                  <Text style={[s.th, s.colIdx]}>#</Text>
                  <Text style={[s.th, s.colGame]}>Game</Text>
                  <Text style={[s.th, s.colType]}>Type</Text>
                  <Text style={[s.th, s.colNum]}>Number</Text>
                  <Text style={[s.th, s.colAmt]}>Amount</Text>
                  <Text style={[s.th, s.colTime]}>Time</Text>
                </View>

                {rows.length ? (
                  rows.map((r, i) => (
                    <View key={r.id ?? i} style={s.tr}>
                      <Text style={[s.td, s.colIdx]}>{i + 1}</Text>
                      <Text style={[s.td, s.colGame]} numberOfLines={1}>
                        {r.game}
                      </Text>
                      <Text style={[s.td, s.colType]} numberOfLines={1}>
                        {fmtType(r.type)}
                      </Text>
                      <Text style={[s.td, s.colNum]} numberOfLines={1}>
                        {r.number}
                      </Text>
                      <Text style={[s.td, s.colAmt]}>{INR(r.amount)}</Text>
                      <Text style={[s.td, s.colTime]} numberOfLines={1}>
                        {r.time}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={[s.tr, s.emptyRow]}>
                    <Text style={s.emptyText}>
                      {loading ? "Loading..." : "No bets found for current month."}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {!!err && (
              <Text style={s.errText}>
                {err}
              </Text>
            )}
          </View>

          {/* bottom spacing for gesture bar */}
          <SafeAreaView edges={["bottom"]} style={{ height: 14 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },

  // ✅ keeps card centered on big phones + scrolls on small
  scrollContent: { flexGrow: 1, alignItems: "center", paddingBottom: 16 },
  frame: { width: "100%", maxWidth: MAX_WIDTH },

  /* Top bar - theme colors */
  topbar: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topbarBack: { padding: 6, marginRight: 8 },
  topbarTitle: { color: "#fff", fontWeight: "800", fontSize: 16, flex: 1, marginRight: 10 },

  topbarBtns: { flexDirection: "row", alignItems: "center", gap: 8 },

  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 6,
    backgroundColor: THEME.pink,
  },
  backTxt: { color: "#fff", fontWeight: "700" },

  /* Card */
  card: {
    marginTop: 14,
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      web: { boxShadow: "0 12px 24px rgba(0,0,0,0.08)" },
      default: {
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },

  headingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "800", color: THEME.textDark, flex: 1 },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginBottom: 10,
    gap: 10,
  },
  sumText: { color: "#374151" },
  sumBold: { fontWeight: "900", color: THEME.textDark },

  /* Table */
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    // ✅ Minimum width so columns look stable; phone uses horizontal scroll
    minWidth: 820,
  },
  tr: { flexDirection: "row", alignItems: "center" },

  thead: { backgroundColor: THEME.primary },
  th: { color: "#fff", fontWeight: "700", paddingVertical: 10, paddingHorizontal: 10, fontSize: 14 },
  td: {
    color: THEME.textDark,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },

  emptyRow: { backgroundColor: "#f3f4f6", justifyContent: "center" },
  emptyText: { color: "#6b7280", textAlign: "center", flex: 1, fontWeight: "600", paddingVertical: 12 },

  errText: { color: "#dc2626", marginTop: 10, textAlign: "center", fontWeight: "700" },

  /* Column widths */
  colIdx: { width: 44, textAlign: "center" },
  colGame: { width: 170 },
  colType: { width: 120 },
  colNum: { width: 100, textAlign: "center" },
  colAmt: { width: 120, textAlign: "center" },
  colTime: { width: 210 },
});
