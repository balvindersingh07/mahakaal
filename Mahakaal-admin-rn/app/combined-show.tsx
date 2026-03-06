// app/combined-show.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../lib/api";

const INR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const todayDMY = (d = new Date()) =>
  `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
const monthLabel = (d = new Date()) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(d);

type TodayRow  = { gameId: string; amount: number; bets: number };
type MonthRow  = { date: string; amount: number; bets: number };
type Stats     = {
  usersTotal: number; usersNew: number;
  betsTotal: number;  betsRecent: number; txRecent: number;
};

type ProfitSummary = {
  stake: number;
  win: number;
  commission: number;
  gross: number;
  net: number;
};

const MAX_CONTENT = 1100;

export default function CombinedShowScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, MAX_CONTENT);

  const [stats,       setStats]       = useState<Stats | null>(null);
  const [todayRows,   setTodayRows]   = useState<TodayRow[]>([]);
  const [monthRows,   setMonthRows]   = useState<MonthRow[]>([]);
  const [todayTotal,  setTodayTotal]  = useState(0);
  const [monthTotal,  setMonthTotal]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const [profitToday, setProfitToday] = useState<ProfitSummary | null>(null);
  const [profitMonth, setProfitMonth] = useState<ProfitSummary | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r: any = await api.combinedShow();

      setStats(r?.stats || r?.combined || null);

      const tRows: TodayRow[] = r?.today?.rows || [];
      setTodayRows(tRows.sort((a, b) => b.amount - a.amount));
      setTodayTotal(r?.today?.total ?? tRows.reduce((s, x) => s + x.amount, 0));

      const mRows: MonthRow[] = r?.month?.rows || [];
      setMonthRows(mRows);
      setMonthTotal(r?.month?.total ?? mRows.reduce((s, x) => s + x.amount, 0));

      const profit = r?.profit || {};
      setProfitToday(profit?.today ?? null);
      setProfitMonth(profit?.month ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8f5ff" }}
      contentContainerStyle={{ padding: 16, gap: 24, maxWidth: maxW, alignSelf: "center", width: "100%" }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.pageTitle}>Combined Show / Reports</Text>
        <Pressable onPress={load} disabled={loading} style={styles.refreshBtn}>
          {loading
            ? <ActivityIndicator size="small" color="#6C2BD9" />
            : <Ionicons name="refresh" size={18} color="#6C2BD9" />
          }
        </Pressable>
      </View>

      {/* Error */}
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontWeight: "700", flex: 1 }}>{error}</Text>
        </View>
      )}

      {/* ── Stats Cards ── */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Total Users"    value={stats.usersTotal}  color="#6C2BD9" />
          <StatCard label="New Users (48h)" value={stats.usersNew}   color="#7c3aed" />
          <StatCard label="Total Bets"     value={stats.betsTotal}   color="#0891b2" />
          <StatCard label="Bets (48h)"     value={stats.betsRecent}  color="#d97706" />
          <StatCard label="Txns (48h)"     value={stats.txRecent}    color="#059669" />
        </View>
      )}

      {/* ── Profit / Loss Quick View ── */}
      {(profitToday || profitMonth) && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {profitToday && (
            <Pressable
              style={[styles.profitCard, { borderLeftColor: profitToday.net >= 0 ? "#16a34a" : "#b91c1c" }]}
              onPress={() => router.push("/payment-report")}
            >
              <Text style={styles.profitTitle}>Today Net Profit</Text>
              <Text
                style={[
                  styles.profitValue,
                  { color: profitToday.net >= 0 ? "#16a34a" : "#b91c1c" },
                ]}
              >
                {INR(profitToday.net)}
              </Text>
              <Text style={styles.profitSub}>
                Stake {INR(profitToday.stake)} − Winnings {INR(profitToday.win)} − Referral{" "}
                {INR(profitToday.commission)}
              </Text>
              <Text style={styles.profitHint}>Tap to open Payment Report</Text>
            </Pressable>
          )}

          {profitMonth && (
            <Pressable
              style={[styles.profitCard, { borderLeftColor: profitMonth.net >= 0 ? "#0ea5e9" : "#b91c1c" }]}
              onPress={() => router.push("/payment-report")}
            >
              <Text style={styles.profitTitle}>Monthly Net Profit</Text>
              <Text
                style={[
                  styles.profitValue,
                  { color: profitMonth.net >= 0 ? "#0ea5e9" : "#b91c1c" },
                ]}
              >
                {INR(profitMonth.net)}
              </Text>
              <Text style={styles.profitSub}>
                Stake {INR(profitMonth.stake)} − Winnings {INR(profitMonth.win)} − Referral{" "}
                {INR(profitMonth.commission)}
              </Text>
              <Text style={styles.profitHint}>Tap to open Payment Report</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Today Report ── */}
      <SectionHeading icon="today-outline" title={`Today Bet Report (${todayDMY()})`} />
      <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
        Shows how much money was bet on each game today and how many bets were placed.
      </Text>

      {loading && todayRows.length === 0 ? (
        <Loader />
      ) : (
        <View style={styles.table}>
          <TableHeader left="Game" right="Total Amount" />
          {todayRows.length === 0 ? (
            <EmptyRow text="Aaj koi bet nahi" />
          ) : (
            todayRows.map((r, idx) => (
              <TableRow
                key={r.gameId}
                left={r.gameId.toUpperCase()}
                right={INR(r.amount)}
                sub={`${r.bets} bets`}
                zebra={idx % 2 === 1}
              />
            ))
          )}
          <TableRow left="Total" right={INR(todayTotal)} total />
        </View>
      )}

      {/* ── Monthly Report ── */}
      <SectionHeading icon="calendar-outline" title={`Monthly Bet Report (${monthLabel()})`} />
      <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
        Per-day total bet amount and number of bets for the current month.
      </Text>

      {loading && monthRows.length === 0 ? (
        <Loader />
      ) : (
        <View style={styles.table}>
          <TableHeader left="Date" right="Total Amount" green />
          {monthRows.length === 0 ? (
            <EmptyRow text="Is mahine koi bet nahi" />
          ) : (
            monthRows.map((r, idx) => (
              <TableRow
                key={r.date}
                left={r.date}
                right={INR(r.amount)}
                sub={`${r.bets} bets`}
                zebra={idx % 2 === 0}
              />
            ))
          )}
          <TableRow left="Total" right={INR(monthTotal)} blueTotal />
        </View>
      )}
    </ScrollView>
  );
}

/* ─── Small components ─── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value.toLocaleString("en-IN")}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeading({
  title,
  icon = "information-circle-outline",
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.hr} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={18} color="#111827" />
        <Text style={styles.heading}>{title}</Text>
      </View>
    </View>
  );
}

function TableHeader({ left, right, green = false }: { left: string; right: string; green?: boolean }) {
  return (
    <View style={[styles.row, { backgroundColor: green ? "#d1fae5" : "#111827" }, styles.rowRoundedTop]}>
      <Text style={[styles.cellLeft, green ? styles.cellDark : styles.cellLight, styles.bold]}>{left}</Text>
      <Text style={[styles.cellRight, green ? styles.cellDark : styles.cellLight, styles.bold]}>{right}</Text>
    </View>
  );
}

function TableRow({
  left, right, sub, zebra = false, total = false, blueTotal = false,
}: {
  left: string; right: string; sub?: string;
  zebra?: boolean; total?: boolean; blueTotal?: boolean;
}) {
  const bg = total ? "#d1fae5" : blueTotal ? "#c7d2fe" : zebra ? "#f9fafb" : "#ffffff";
  return (
    <View style={[styles.row, { backgroundColor: bg }]}>
      <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14 }}>
        <Text style={[styles.darkText, total && styles.bold]}>{left}</Text>
        {!!sub && <Text style={{ fontSize: 11, color: "#6b7280" }}>{sub}</Text>}
      </View>
      <Text style={[styles.cellRight, styles.darkText, total && styles.bold]}>{right}</Text>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 20, alignItems: "center" }}>
      <Text style={{ color: "#9ca3af", fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

function Loader() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 24 }}>
      <ActivityIndicator color="#6C2BD9" />
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  pageTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "#DCF8C6", alignItems: "center", justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fee2e2", borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: "#fca5a5",
  },

  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
  statCard: {
    flex: 1, minWidth: 140, backgroundColor: "#fff",
    borderRadius: 10, padding: 14,
    borderLeftWidth: 4, borderWidth: 1, borderColor: "#e5e7eb",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },

  profitCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 4,
  },
  profitTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  profitValue: { fontSize: 20, fontWeight: "900" },
  profitSub: { fontSize: 11, color: "#6b7280" },
  profitHint: { fontSize: 10, color: "#4b5563", marginTop: 2 },

  hr: { height: 2, backgroundColor: "#111827", opacity: 0.9, marginBottom: 4 },
  heading: { fontSize: 17, fontWeight: "800", color: "#111827" },

  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" },
  row: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb",
    minHeight: 44, alignItems: "center",
  },
  rowRoundedTop: { borderTopWidth: 0 },
  cellLeft:  { flex: 1, paddingVertical: 10, paddingHorizontal: 14 },
  cellRight: { width: 160, textAlign: "right", paddingVertical: 10, paddingHorizontal: 14 },
  cellLight: { color: "#ffffff" },
  cellDark:  { color: "#111827" },
  darkText:  { color: "#111827" },
  bold:      { fontWeight: "800" },
});
