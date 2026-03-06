// src/screens/winnings/WinningsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Pressable,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../api";
import { THEME } from "../../theme";

const LOGO = require("../../../assets/icon-512.png");
const APP_BG = THEME.bg;

/* ---------------- helpers ---------------- */
const inr = (x) => `₹${(Number(x) || 0).toLocaleString("en-IN")}`;

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  const tt = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dd}, ${tt}`;
};

// ✅ extract array from any common response shape
const pickArray = (r) => {
  const d = r?.data ?? r;

  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.results)) return d.results;
  if (Array.isArray(d?.winnings)) return d.winnings;

  // nested like { data: { items: [] } }
  if (Array.isArray(d?.data?.items)) return d.data.items;
  if (Array.isArray(d?.data?.rows)) return d.data.rows;

  return null;
};

// Normalize various server shapes → one UI row
function normalizeWin(raw) {
  const id = String(raw?.id || raw?._id || raw?.slipId || raw?.betId || raw?.reference || raw?.ref || "");

  const payout =
    Number(raw?.payout ?? raw?.winAmount ?? raw?.amountWon ?? raw?.winnings ?? raw?.prize ?? raw?.totalWin) || 0;

  const stake =
    Number(raw?.stake ?? raw?.betAmount ?? raw?.amount ?? raw?.totalStake ?? raw?.playedAmount) || 0;

  // ✅ profit only meaningful if stake > 0
  const profit = stake > 0 ? payout - stake : null;

  const game =
    raw?.game?.name ||
    raw?.gameName ||
    raw?.game ||
    raw?.market ||
    raw?.title ||
    (raw?.gameId ? String(raw.gameId).toUpperCase() : "GAME");

  // numbers played
  let numbers = "";
  const items = raw?.items;

  if (Array.isArray(items)) {
    const keys = items
      .map((it) => it?.key ?? it?.num ?? it?.number ?? it?.label ?? it?.value)
      .filter(Boolean)
      .map((x) => String(x).toUpperCase());

    numbers = keys.slice(0, 8).join(", ") + (keys.length > 8 ? " …" : "");
  } else {
    numbers = String(raw?.numbers ?? raw?.number ?? raw?.combo ?? "").toUpperCase();
  }

  const resultAt = raw?.resultAt || raw?.settledAt || raw?.updatedAt || raw?.createdAt || null;

  return {
    id,
    game: String(game).toUpperCase(),
    payout,
    stake,
    profit,
    numbers: String(numbers || ""),
    resultAt,
  };
}

export default function WinningsScreen() {
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack && navigation.canGoBack()) return navigation.goBack();
    navigation.navigate("MainTabs", { screen: "Home" });
  }, [navigation]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);       // initial only
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const fetchWins = useCallback(async (isRefresh = false) => {
    setErr("");
    try {
      if (!isRefresh) setLoading(true);

      let list = null;

      // Try multiple likely endpoints; first array wins
      try { list = pickArray(await API.winnings?.()); } catch {}
      if (!list) { try { list = pickArray(await API.betsWins?.()); } catch {} }
      if (!list) { try { list = pickArray(await API.winHistory?.()); } catch {} }
      if (!list) {
        try {
          const r4 = await API.slips?.({ status: "WIN" });
          list = pickArray(r4);
        } catch {}
      }

      if (!list) {
        setRows([]);
        return;
      }

      const normalized = list
        .map(normalizeWin)
        .filter((x) => x.payout > 0 || x.stake > 0 || x.id) // ✅ avoid totally empty rows
        .sort((a, b) => {
          const ta = a.resultAt ? new Date(a.resultAt).getTime() : 0;
          const tb = b.resultAt ? new Date(b.resultAt).getTime() : 0;
          return tb - ta;
        });

      setRows(normalized);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to load winnings.");
      setRows([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWins(false);
  }, [fetchWins]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchWins(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchWins]);

  const totalPayout = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.payout) || 0), 0),
    [rows]
  );

  const totalProfit = useMemo(
    () => rows.reduce((s, r) => s + (Number.isFinite(r.profit) ? Number(r.profit) : 0), 0),
    [rows]
  );

  const renderItem = ({ item }) => (
    <View style={s.row}>
      <View style={s.trophy}>
        <Ionicons name="trophy-outline" size={20} color="#16a34a" />
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.rowTop}>
          <Text style={s.game}>{item.game}</Text>
          <Text style={s.winChip}>WIN</Text>
        </View>

        {!!item.numbers && (
          <Text style={s.numbers} numberOfLines={2}>
            {item.numbers}
          </Text>
        )}

        <View style={s.moneyRow}>
          <Text style={[s.money, { color: "#16a34a" }]}>{inr(item.payout)}</Text>

          {item.stake > 0 && <Text style={s.meta}>Stake: {inr(item.stake)}</Text>}

          {Number.isFinite(item.profit) && (
            <Text
              style={[
                s.metaBold,
                { color: item.profit >= 0 ? "#16a34a" : "#dc2626" },
              ]}
            >
              Profit: {inr(item.profit)}
            </Text>
          )}
        </View>

        <View style={s.bottomRow}>
          {!!item.resultAt && <Text style={s.meta}>{fmt(item.resultAt)}</Text>}
          {!!item.id && (
            <Text style={[s.meta, { marginLeft: "auto" }]}>
              Ref: {item.id.slice(0, 10)}
              {item.id.length > 10 ? "…" : ""}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header with single back */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>

        <Text style={s.headerTitle}>My Winnings</Text>

        <Pressable onPress={() => fetchWins(false)} hitSlop={10} style={s.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#111827" />
        </Pressable>
      </View>

      {/* Logo */}
      <Image source={LOGO} style={s.logo} resizeMode="contain" />

      {/* Summary */}
      <View style={s.summary}>
        <View style={{ flex: 1 }}>
          <Text style={s.sumLabel}>Total Payout</Text>
          <Text style={s.sumVal}>{inr(totalPayout)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sumLabel}>Total Profit</Text>
          <Text style={[s.sumVal, { color: totalProfit >= 0 ? "#16a34a" : "#dc2626" }]}>
            {inr(totalProfit)}
          </Text>
        </View>
      </View>

      {/* List */}
      <View style={s.card}>
        {loading ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator />
          </View>
        ) : rows.length === 0 ? (
          <>
            {!!err && <Text style={[s.empty, { color: "#dc2626" }]}>{err}</Text>}
            <Text style={s.empty}>🪙 You haven't won any bets yet.</Text>
          </>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(it, idx) => it.id || String(idx)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },

  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: APP_BG,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#111827" },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  logo: { width: 80, height: 80, borderRadius: 40, alignSelf: "center", marginVertical: 8 },

  summary: { flexDirection: "row", gap: 10, marginHorizontal: 12, marginBottom: 8 },
  sumLabel: { color: "#64748b", fontWeight: "700" },
  sumVal: { fontSize: 18, fontWeight: "900", color: "#0f172a" },

  card: {
    alignSelf: "center",
    width: "92%",
    maxWidth: 820,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    elevation: 3,
    ...Platform.select({
      web: { boxShadow: "0 10px 24px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    }),
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  trophy: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4" },

  rowTop: { flexDirection: "row", alignItems: "center" },
  game: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111827" },

  winChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#16a34a",
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    overflow: "hidden",
  },

  numbers: { marginTop: 2, color: "#334155" },

  moneyRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  money: { fontSize: 16, fontWeight: "900" },
  meta: { color: "#64748b" },
  metaBold: { fontWeight: "900" },

  bottomRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 10 },

  empty: { color: "#6b7280", fontWeight: "600", textAlign: "center", paddingVertical: 14 },
});
