// app/wins.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { pickBetType, pickNumber } from "../lib/betDisplay";

type WinRow = {
  _id: string;
  name: string;
  phone: string;
  game: string;
  number: string;
  type: string;
  bet: number;
  win: number;
  settledAt: string;
};

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const dmyTime = (iso: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h: number | string = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${dd}-${mm}-${yyyy} ${h}:${m} ${ampm}`;
};

// Uses shared pickBetType & pickNumber from lib/betDisplay

const BREAK = 900;

export default function WinsScreen() {
  const { width } = useWindowDimensions();
  const useCards = width < BREAK;

  const [phone, setPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [rows, setRows] = useState<WinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWins = useCallback(async (searchPhone = "") => {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = { status: "won" };
      const q = searchPhone.trim();
      if (q) params.phone = q;

      const data: any = await (api as any).bets(params);

      if (data && data.success === false) {
        throw new Error(data.message || "Failed to load wins");
      }

      const list: any[] = data?.rows || data?.bets || data?.items || [];

      const mapped: WinRow[] = list.map((b: any, i: number) => ({
        _id: String(b?._id || b?.id || `${Date.now()}-${i}`),
        name: String(b?.user?.username || b?.username || "-"),
        phone: String(b?.user?.phone || b?.phone || "-"),
        game: String(b?.gameName || b?.gameId || "-"),
        number: pickNumber(b),
        type: pickBetType(b),
        bet: Number(b?.total || 0),
        win: Number(b?.winAmount || 0),
        settledAt: String(b?.updatedAt || b?.createdAt || new Date().toISOString()),
      }));

      // filter by phone if given
      const filtered = q
        ? mapped.filter((r) => r.phone.includes(q))
        : mapped;

      setRows(filtered.sort((a, b) => +new Date(b.settledAt) - +new Date(a.settledAt)));
    } catch (e: any) {
      setError(e?.message || "Failed to load wins");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWins();
  }, [loadWins]);

  const onSearch = () => {
    setSubmittedPhone(phone.trim());
    loadWins(phone.trim());
  };

  const onClear = () => {
    setPhone("");
    setSubmittedPhone("");
    loadWins("");
  };

  // Summary totals
  const summary = useMemo(() => {
    const totalBet = rows.reduce((s, r) => s + r.bet, 0);
    const totalWin = rows.reduce((s, r) => s + r.win, 0);
    return { totalBet, totalWin, count: rows.length };
  }, [rows]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8f5ff" }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={styles.wrap}>
        <Text style={styles.notice}>
          All winnings shown here have already been{" "}
          <Text style={{ fontWeight: "900" }}>credited to user wallets</Text> when the result was
          declared.
        </Text>
        {/* Search row */}
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search by Phone"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={setPhone}
            keyboardType="number-pad"
            style={styles.input}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />

          <Pressable
            style={[styles.btn, styles.btnGreen, loading && { opacity: 0.6 }]}
            onPress={onSearch}
            disabled={loading}
          >
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.btnGreenText}>{loading ? "..." : "Search"}</Text>
          </Pressable>

          <Pressable style={[styles.btn, styles.btnLightRed]} onPress={onClear} disabled={loading}>
            <Ionicons name="close" size={16} color="#b91c1c" />
            <Text style={styles.btnLightRedText}>Clear</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnBlue, loading && { opacity: 0.6 }]}
            onPress={() => loadWins(submittedPhone)}
            disabled={loading}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.btnBlueText}>Refresh</Text>
          </Pressable>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={{ color: "#ef4444", fontWeight: "700", flex: 1 }}>{error}</Text>
          </View>
        )}

        {/* Summary chips */}
        {!loading && rows.length > 0 && (
          <View style={styles.chipsRow}>
            <Chip label={`Winners: ${summary.count}`} color="#6C2BD9" bg="#DCF8C6" />
            <Chip label={`Total Bet: ${inr(summary.totalBet)}`} color="#92400e" bg="#fef3c7" />
            <Chip label={`Total Payout: ${inr(summary.totalWin)}`} color="#065f46" bg="#d1fae5" />
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={{ color: "#6b7280", marginTop: 10, fontWeight: "700" }}>
              Loading wins...
            </Text>
          </View>
        )}

        {/* Table / Cards */}
        {!loading && (
          <View style={styles.card}>
            {useCards ? (
              <View style={{ padding: 12, gap: 12 }}>
                {rows.map((r, i) => (
                  <View key={r._id} style={winCardStyles.card}>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Name</Text>
                      <Text style={winCardStyles.value}>{r.name}</Text>
                    </View>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Phone</Text>
                      <Text style={winCardStyles.value}>{r.phone}</Text>
                    </View>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Game</Text>
                      <Text style={winCardStyles.value}>{r.game}</Text>
                    </View>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Type</Text>
                      <Text style={winCardStyles.value}>{r.type}</Text>
                    </View>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Number</Text>
                      <Text style={winCardStyles.value}>{r.number}</Text>
                    </View>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Bet / Win</Text>
                      <Text style={winCardStyles.value}>{inr(r.bet)} → {inr(r.win)}</Text>
                    </View>
                    <View style={winCardStyles.row}>
                      <Text style={winCardStyles.label}>Settled</Text>
                      <Text style={winCardStyles.value}>{dmyTime(r.settledAt)}</Text>
                    </View>
                  </View>
                ))}
                {rows.length === 0 && (
                  <View style={{ paddingVertical: 28, alignItems: "center" }}>
                    <Text style={{ color: "#9ca3af", fontWeight: "700" }}>No winning bets found</Text>
                  </View>
                )}
              </View>
            ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ minWidth: Math.max(width - 48, 700) }}
            >
              <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={[styles.row, styles.head]}>
                  <Text style={[styles.th, { flex: 0.8 }]}>#</Text>
                  <Text style={[styles.th, { flex: 1.8 }]}>Name</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Phone</Text>
                  <Text style={[styles.th, { flex: 1.8 }]}>Game</Text>
                  <Text style={[styles.th, { flex: 1.2 }]}>Number</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Type</Text>
                  <Text style={[styles.th, { flex: 1.2 }]}>Bet</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Win</Text>
                  <Text style={[styles.th, { flex: 2.2 }]}>Settled At</Text>
                </View>

                {/* Empty */}
                {rows.length === 0 ? (
                  <View style={{ paddingVertical: 28, alignItems: "center" }}>
                    <Text style={{ color: "#9ca3af", fontWeight: "700" }}>
                      No winning bets found
                    </Text>
                  </View>
                ) : (
                  rows.map((r, i) => (
                    <View key={r._id} style={[styles.row, i % 2 === 1 && styles.zebra]}>
                      <Text style={[styles.td, { flex: 0.8 }]}>{i + 1}</Text>
                      <Text style={[styles.td, { flex: 1.8 }]}>{r.name}</Text>
                      <Text style={[styles.td, { flex: 2 }]}>{r.phone}</Text>
                      <Text
                        style={[styles.td, { flex: 1.8, textTransform: "capitalize" }]}
                      >
                        {r.game}
                      </Text>
                      <Text style={[styles.td, { flex: 1.2 }]}>{r.number}</Text>
                      <Text style={[styles.td, { flex: 1.4 }]}>{r.type}</Text>
                      <Text style={[styles.td, { flex: 1.2 }]}>{inr(r.bet)}</Text>
                      <Text
                        style={[
                          styles.td,
                          { flex: 1.4, fontWeight: "800", color: "#15803d" },
                        ]}
                      >
                        {inr(r.win)}
                      </Text>
                      <Text style={[styles.td, { flex: 2.2 }]}>
                        {dmyTime(r.settledAt)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={{ fontWeight: "800", color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 1100, alignSelf: "center", gap: 12 },
  notice: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
    paddingVertical: 4,
  },

  searchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  input: {
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexGrow: 1,
    minWidth: 220,
    maxWidth: 420,
  },
  btn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnGreen: { backgroundColor: "#6C2BD9" },
  btnGreenText: { color: "#fff", fontWeight: "800" },
  btnLightRed: { backgroundColor: "#fee2e2" },
  btnLightRedText: { color: "#b91c1c", fontWeight: "800" },
  btnBlue: { backgroundColor: "#128C7E" },
  btnBlueText: { color: "#fff", fontWeight: "800" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  head: { backgroundColor: "#6C2BD9" },
  th: {
    color: "#fff",
    fontWeight: "800",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  td: { paddingHorizontal: 10, color: "#111827" },
  zebra: { backgroundColor: "#f0fdf4" },
});

const winCardStyles = StyleSheet.create({
  card: { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: "600", minWidth: 70 },
  value: { flex: 1, fontSize: 14, color: "#111827" },
});
