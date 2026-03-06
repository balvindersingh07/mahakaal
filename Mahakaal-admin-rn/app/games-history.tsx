// app/games-history.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useAutoRefresh } from "../lib/useAutoRefresh";
import { pickBetType, pickNumber, pickGame, pickAmount } from "../lib/betDisplay";

type GameOption = { label: string; slug: string }; // ✅ expo-router app folder

type Row = {
  _id: string;
  phone: string;
  username: string;
  game: string;
  betType: string;
  number: string;
  amount: number;
  status: "Win" | "Loss" | "Pending";
  createdAt: string;
};

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function statusColor(s: Row["status"]) {
  if (s === "Win") return "#16a34a";
  if (s === "Loss") return "#ef4444";
  return "#2563eb";
}

// ✅ BetSchema status: pending | won | lost | refunded
function mapStatus(raw: any): Row["status"] {
  const s = String(raw || "").toLowerCase();
  if (["won", "win", "success"].includes(s)) return "Win";
  if (["lost", "loss", "fail", "failed"].includes(s)) return "Loss";
  // pending / refunded -> Pending (UI simple)
  return "Pending";
}

const BREAK = 900;

export default function GamesHistory() {
  const { width } = useWindowDimensions();
  const useCards = width < BREAK;

  const [phone, setPhone] = useState("");
  const [submit, setSubmit] = useState(0);

  const [gameFilter, setGameFilter] = useState("");
  const [gameFilterLabel, setGameFilterLabel] = useState("");
  const [gameOptions, setGameOptions] = useState<GameOption[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [openGameDropdown, setOpenGameDropdown] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setGamesLoading(true);
        const res: any = await api.games();
        const list: any[] = res?.games || res?.data || res?.rows || res?.items || [];
        const opts: GameOption[] = list.map((g: any) => ({
          label: String(g.name || g.gameName || g.slug || "").toUpperCase(),
          slug: String(g.slug || g.gameId || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || String(g.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        }));
        setGameOptions(opts);
      } catch {
        setGameOptions([]);
      } finally {
        setGamesLoading(false);
      }
    })();
  }, []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const loadBets = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const to = now.toISOString();
      const params: Record<string, string> = { from, to };
      const q = phone.trim();
      if (q) params.phone = q;

      const data: any = await (api as any).bets(params);
      if (data && data.success === false) {
        throw new Error(data.message || "Failed to load bets");
      }

      const list: any[] = data?.rows || data?.bets || data?.items || [];
      const mapped: Row[] = list.map((b: any) => ({
        _id: String(b?._id || b?.id || `${Date.now()}-${Math.random()}`),
        phone: String(b?.user?.phone || ""),
        username: String(b?.user?.username || "-"),
        game: pickGame(b),
        betType: pickBetType(b),
        number: pickNumber(b),
        amount: pickAmount(b),
        status: mapStatus(b?.status),
        createdAt: String(b?.createdAt || new Date().toISOString()),
      }));

      const since = Date.now() - 48 * 60 * 60 * 1000;
      const filtered = mapped
        .filter((x) => new Date(x.createdAt).getTime() >= since)
        .filter((x) => (q ? x.phone.includes(q) : true))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      setRows(filtered);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message || "Unable to load bets");
    } finally {
      setLoading(false);
    }
  }, [phone, submit]);

  useEffect(() => { loadBets(); }, [loadBets]);
  useAutoRefresh(loadBets, { intervalMs: 15000 });

    const list = useMemo(
      () =>
        rows.filter((r) => {
          if (!gameFilter.trim()) return true;
          const norm = (s: string) =>
            s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
          return norm(r.game) === norm(gameFilter) || norm(r.game).includes(norm(gameFilter));
        }),
      [rows, gameFilter]
    );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8f5ff" }}>
      <View style={styles.container}>
        <Text style={styles.title}>Search User Bets (Last 2 Days)</Text>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search by Mobile Number"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={setPhone}
            keyboardType="number-pad"
            style={styles.searchInput}
          />
          <Pressable
            onPress={() => setOpenGameDropdown(true)}
            style={[styles.searchInput, { minWidth: 260, justifyContent: "space-between", flexDirection: "row", alignItems: "center" }]}
          >
            <Text style={{ color: gameFilterLabel || gameFilter ? "#111827" : "#9ca3af" }}>
              {gamesLoading ? "Loading..." : gameFilterLabel || gameFilter || "Optional: Filter by Game"}
            </Text>
            {!gamesLoading && <Ionicons name="chevron-down" size={16} color="#6b7280" />}
          </Pressable>
          {openGameDropdown && (
            <Modal transparent visible animationType="fade">
              <Pressable style={modalStyles.backdrop} onPress={() => setOpenGameDropdown(false)}>
                <View style={modalStyles.sheet}>
                  <Text style={{ fontWeight: "800", marginBottom: 8 }}>Select Game</Text>
                  <ScrollView style={{ maxHeight: 300 }}>
                    <Pressable
                      style={modalStyles.opt}
                      onPress={() => {
                        setGameFilter("");
                        setGameFilterLabel("");
                        setOpenGameDropdown(false);
                      }}
                    >
                      <Text style={{ color: "#6b7280" }}>All games</Text>
                    </Pressable>
                    {gameOptions.map((g) => (
                      <Pressable
                        key={g.slug}
                        style={[modalStyles.opt, gameFilter === g.slug && { backgroundColor: "#eff6ff" }]}
                        onPress={() => {
                          setGameFilter(g.slug);
                          setGameFilterLabel(g.label);
                          setOpenGameDropdown(false);
                        }}
                      >
                        <Text style={{ fontWeight: gameFilter === g.slug ? "800" : "400" }}>{g.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
          )}
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => setSubmit((n) => n + 1)}
            disabled={loading}
          >
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>
              {loading ? "Loading..." : "Search"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>
          Shows bets from the last 48 hours only. You can search by mobile number and optionally filter by game name.
        </Text>

        {!!err && (
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <Text style={{ color: "#ef4444", fontWeight: "800" }}>{err}</Text>
            <Text style={{ color: "#6b7280", marginTop: 4, fontWeight: "700" }}>
              Tip: ensure Admin login token set in app (Authorization Bearer)
            </Text>
          </View>
        )}

        {loading ? (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: "#6b7280", fontWeight: "700" }}>
              Loading bets...
            </Text>
          </View>
        ) : list.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: "#9ca3af", fontWeight: "700" }}>
              No bets found in last 2 days
            </Text>
          </View>
        ) : useCards ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            {list.map((b) => (
              <View key={b._id} style={ghCardStyles.card}>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Game</Text>
                  <Text style={ghCardStyles.value}>{b.game}</Text>
                </View>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Type</Text>
                  <Text style={ghCardStyles.value}>{b.betType || "Jantri"}</Text>
                </View>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Number</Text>
                  <Text style={ghCardStyles.value}>{b.number}</Text>
                </View>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Amount</Text>
                  <Text style={ghCardStyles.value}>{inr(b.amount)}</Text>
                </View>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Status</Text>
                  <Text style={[ghCardStyles.value, { fontWeight: "800", color: statusColor(b.status) }]}>{b.status}</Text>
                </View>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Date/Time</Text>
                  <Text style={ghCardStyles.value}>{fmt(b.createdAt)}</Text>
                </View>
                <View style={ghCardStyles.row}>
                  <Text style={ghCardStyles.label}>Phone</Text>
                  <Text style={ghCardStyles.value}>{b.phone || "-"}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16 }}
            contentContainerStyle={{ minWidth: Math.max(width - 48, 700) }}
          >
            <View style={{ minWidth: 1000 }}>
              <View style={[styles.row, styles.head]}>
                <Text style={[styles.th, { flex: 1.8 }]}>Game</Text>
                <Text style={[styles.th, { flex: 1.2 }]}>Type</Text>
                <Text style={[styles.th, { flex: 1.4 }]}>Number</Text>
                <Text style={[styles.th, { flex: 1.4 }]}>Amount</Text>
                <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>
                <Text style={[styles.th, { flex: 2 }]}>Date/Time</Text>
                <Text style={[styles.th, { flex: 2 }]}>Phone</Text>
              </View>

              {list.map((b, i) => (
                <View
                  key={b._id}
                  style={[styles.row, i % 2 === 0 && styles.zebra]}
                >
                  <Text style={[styles.td, { flex: 1.8 }]}>{b.game}</Text>
                  <Text style={[styles.td, { flex: 1.2 }]}>{b.betType || "Jantri"}</Text>
                  <Text style={[styles.td, { flex: 1.4 }]}>{b.number}</Text>
                  <Text style={[styles.td, { flex: 1.4 }]}>{inr(b.amount)}</Text>
                  <Text
                    style={[
                      styles.td,
                      {
                        flex: 1.2,
                        fontWeight: "800",
                        color: statusColor(b.status),
                      },
                    ]}
                  >
                    {b.status}
                  </Text>
                  <Text style={[styles.td, { flex: 2 }]}>{fmt(b.createdAt)}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{b.phone || "-"}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 1000,
    alignSelf: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    color: "#111827",
    marginTop: 8,
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  helper: {
    marginTop: 6,
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
  searchInput: {
    height: 40,
    minWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
  btnPrimary: { backgroundColor: "#6C2BD9" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#DCF8C6",
  },
  head: {
    backgroundColor: "#6C2BD9",
    borderRadius: 8,
    marginBottom: 6,
  },
  th: {
    color: "#fff",
    fontWeight: "800",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  td: { paddingHorizontal: 12, color: "#111827" },
  zebra: { backgroundColor: "#f0fdf4" },
});

const ghCardStyles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: "600", minWidth: 70 },
  value: { flex: 1, fontSize: 14, color: "#111827" },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: 320, backgroundColor: "#fff", borderRadius: 12, padding: 12 },
  opt: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
});
