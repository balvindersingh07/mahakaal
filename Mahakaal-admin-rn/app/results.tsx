// app/results.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAutoRefresh } from "../lib/useAutoRefresh";

type ResultRow = {
  _id?: string;
  id?: number;
  gameId: string;
  gameName?: string;
  result: string;
  dateKey?: string;
  createdAt?: string;
  editing?: boolean;
};

type GameOption = { label: string; slug: string };

// UI label -> slug (matches what backend stores)
const toSlug = (g: string) =>
  g.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const fmt = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
};

const BREAK = 900;

export default function ResultsScreen() {
  const { width } = useWindowDimensions();
  const useCards = width < BREAK;

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [declaring, setDeclaring] = useState(false);

  const [game, setGame] = useState("");           // selected game label (name)
  const [gameSlug, setGameSlug] = useState("");   // selected game slug
  const [openGameList, setOpenGameList] = useState(false);
  const [num, setNum] = useState("");

  // Games loaded from backend
  const [gameOptions, setGameOptions] = useState<GameOption[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  // Load game list from API on mount
  useEffect(() => {
    (async () => {
      try {
        setGamesLoading(true);
        const res: any = await api.games();
        const list: any[] = res?.games || res?.data || res?.rows || res?.items || [];
        const opts: GameOption[] = list.map((g: any) => ({
          label: String(g.name || g.gameName || g.slug || "").toUpperCase(),
          slug: String(g.slug || g.gameId || toSlug(g.name || "")),
        }));
        setGameOptions(opts);
      } catch {
        // fallback: empty list, user can still type
      } finally {
        setGamesLoading(false);
      }
    })();
  }, []);

  const nextId = useMemo(
    () =>
      rows.length
        ? Math.max(...rows.map((r) => Number(r.id ?? 0))) + 1
        : 1,
    [rows]
  );

  const validateNum = (v: string) => /^[0-9]{1,2}$/.test(v);
  const asTwo = (v: string) => (v.length === 1 ? `0${v}` : v);

  // ---------- Load previous results from backend ----------
  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api.resultsList();
      const list: any[] = res?.rows || res?.results || res?.items || [];

      const mapped: ResultRow[] = list.map((r: any, i: number) => ({
        _id: String(r._id || r.id || ""),
        id: r._id ? undefined : i + 1,
        gameId: String(r.gameId || r.game || ""),
        gameName: String(r.gameName || r.game || r.gameId || ""),
        result: String(r.result || ""),
        dateKey: String(r.dateKey || ""),
        createdAt: r.createdAt || r.date || "",
        editing: false,
      }));

      setRows(mapped);
    } catch (e: any) {
      Alert.alert("Results", e?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadResults(); }, [loadResults]);
  useAutoRefresh(loadResults, { intervalMs: 15000 });

  // ---------- Declare Result ----------
  const declareResult = async () => {
    if (!game) return Alert.alert("Select Game", "Please choose a game name.");
    if (!validateNum(num))
      return Alert.alert("Invalid Result", "Enter a number between 00 and 99.");

    try {
      setDeclaring(true);
      const payload = {
        gameId: gameSlug || toSlug(game),
        gameName: game,
        result: asTwo(num),
        type: "main",
      };

      const res: any = await api.resultsSet(payload);

      const settle = res?.settle;
      const settleMsg = settle
        ? `\nSettled: ${settle.settled} bets\nWinners: ${settle.winners} | Losers: ${settle.losers}\nPayout: ₹${settle.creditedTotal}`
        : "";

      Alert.alert("Result Declared ✅", `${game} → ${asTwo(num)}${settleMsg}`);

      setNum("");
      setGame("");
      setGameSlug("");
      await loadResults();
    } catch (e: any) {
      Alert.alert("Declare Failed", e?.message || "Failed to declare result");
    } finally {
      setDeclaring(false);
    }
  };

  // ---------- Edit / Update ----------
  const toggleEdit = (key: string, on?: boolean) =>
    setRows((prev) =>
      prev.map((r) => {
        const rKey = r._id || String(r.id);
        return rKey === key ? { ...r, editing: on ?? !r.editing } : r;
      })
    );

  const updateRow = async (row: ResultRow, newResult: string) => {
    if (!validateNum(newResult))
      return Alert.alert("Invalid Result", "Use 00–99 only.");

    try {
      setLoading(true);
      await api.resultsSet({
        gameId: row.gameId,
        gameName: row.gameName || row.gameId,
        result: asTwo(newResult),
        dateKey: row.dateKey,
        type: "main",
      });
      Alert.alert("Updated ✅", `${row.gameName || row.gameId} → ${asTwo(newResult)}`);
      await loadResults();
    } catch (e: any) {
      Alert.alert("Update Failed", e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const removeRow = (row: ResultRow) => {
    Alert.alert(
      "Delete Result?",
      `${row.gameName || row.gameId} - ${row.result}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!row._id) {
              setRows((prev) => prev.filter((r) => r._id !== row._id && r.id !== row.id));
              return;
            }
            try {
              setLoading(true);
              await (api as any).deleteResult(row._id);
              await loadResults();
            } catch {
              setRows((prev) => prev.filter((r) => r._id !== row._id));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8f5ff" }}
      contentContainerStyle={styles.screenPad}
    >
      <View style={styles.wrap}>
        {/* Declare Result card */}
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Game Name</Text>
            <Pressable
              onPress={() => setOpenGameList(true)}
              style={[styles.input, styles.select]}
              disabled={gamesLoading}
            >
              <Text style={{ color: game ? "#111827" : "#9ca3af" }}>
                {gamesLoading ? "Loading games..." : game || "-- Select Game --"}
              </Text>
              {gamesLoading
                ? <ActivityIndicator size="small" color="#6b7280" />
                : <Ionicons name="chevron-down" size={16} color="#6b7280" />
              }
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Result Number</Text>
            <TextInput
              value={num}
              onChangeText={(t) => setNum(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="00"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.btn, styles.btnGreen, (declaring || loading) && { opacity: 0.6 }]}
            onPress={declareResult}
            disabled={declaring || loading}
          >
            {declaring ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkbox" size={16} color="#fff" />
            )}
            <Text style={styles.btnGreenText}>
              {declaring ? "Declaring..." : "Declare Result"}
            </Text>
          </Pressable>
        </View>

        {/* Previous Results */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="document-text" size={18} color="#f59e0b" />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
                Previous Results
              </Text>
            </View>
            <Pressable
              onPress={loadResults}
              disabled={loading}
              style={styles.refreshBtn}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#6C2BD9" />
              ) : (
                <Ionicons name="refresh" size={18} color="#6C2BD9" />
              )}
            </Pressable>
          </View>

          {loading && rows.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator size="large" color="#6C2BD9" />
              <Text style={{ color: "#6b7280", marginTop: 10, fontWeight: "600" }}>
                Loading results...
              </Text>
            </View>
          ) : rows.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ color: "#9ca3af", fontWeight: "700" }}>No results found</Text>
            </View>
          ) : useCards ? (
            <View style={{ gap: 10 }}>
              {rows.map((r, i) => {
                const rKey = r._id || String(r.id ?? i);
                return (
                  <View key={rKey} style={cardResStyles.card}>
                    <View style={cardResStyles.row}>
                      <Text style={cardResStyles.label}>Game</Text>
                      <Text style={cardResStyles.value}>{(r.gameName || r.gameId).toUpperCase()}</Text>
                    </View>
                    <View style={cardResStyles.row}>
                      <Text style={cardResStyles.label}>Result</Text>
                      {r.editing ? (
                        <RowEditor initial={r.result} onCancel={() => toggleEdit(rKey, false)} onSave={(val) => updateRow(r, val)} />
                      ) : (
                        <Text style={{ fontWeight: "700", fontSize: 16 }}>{r.result}</Text>
                      )}
                    </View>
                    <View style={cardResStyles.row}>
                      <Text style={cardResStyles.label}>Date</Text>
                      <Text style={cardResStyles.value}>{fmt(r.createdAt)}</Text>
                    </View>
                    {!r.editing && (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                        <Pressable style={[styles.btnSm, styles.btnYellow]} onPress={() => toggleEdit(rKey, true)}>
                          <Ionicons name="pencil" size={14} color="#111827" />
                          <Text style={[styles.btnSmText, { color: "#111827" }]}>Edit</Text>
                        </Pressable>
                        <Pressable style={[styles.btnSm, styles.btnRed]} onPress={() => removeRow(r)}>
                          <Ionicons name="trash" size={14} color="#fff" />
                          <Text style={styles.btnSmText}>Delete</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <ScrollView
              horizontal
              style={{ width: "100%" }}
              contentContainerStyle={{ minWidth: Math.max(width - 48, 600) }}
              showsHorizontalScrollIndicator
            >
              <View style={{ flex: 1 }}>
                <View style={[styles.row, styles.head]}>
                  <Text style={[styles.th, { flex: 1 }]}>#</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Game</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Result</Text>
                  <Text style={[styles.th, { flex: 3 }]}>Date</Text>
                  <Text style={[styles.th, { flex: 3 }]}>Action</Text>
                </View>

                {rows.map((r, i) => {
                  const rKey = r._id || String(r.id ?? i);
                  const zebra = i % 2 === 0;
                  return (
                    <View key={rKey} style={[styles.row, zebra && styles.zebra]}>
                      <Text style={[styles.td, { flex: 1 }]}>{i + 1}</Text>
                      <Text style={[styles.td, { flex: 2 }]}>
                        {(r.gameName || r.gameId).toUpperCase()}
                      </Text>

                      <View style={[styles.td, { flex: 2 }]}>
                        {r.editing ? (
                          <RowEditor
                            initial={r.result}
                            onCancel={() => toggleEdit(rKey, false)}
                            onSave={(val) => updateRow(r, val)}
                          />
                        ) : (
                          <Text style={{ fontWeight: "700" }}>{r.result}</Text>
                        )}
                      </View>

                      <Text style={[styles.td, { flex: 3 }]}>
                        {fmt(r.createdAt)}
                      </Text>

                      <View
                        style={[styles.td, { flex: 3, flexDirection: "row", gap: 8 }]}
                      >
                        {!r.editing && (
                          <Pressable
                            style={[styles.btnSm, styles.btnYellow]}
                            onPress={() => toggleEdit(rKey, true)}
                          >
                            <Ionicons name="pencil" size={14} color="#111827" />
                            <Text style={[styles.btnSmText, { color: "#111827" }]}>
                              Edit
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.btnSm, styles.btnRed]}
                          onPress={() => removeRow(r)}
                        >
                          <Ionicons name="trash" size={14} color="#fff" />
                          <Text style={styles.btnSmText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      {/* Game list modal */}
      <Modal
        visible={openGameList}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenGameList(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setOpenGameList(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>Select Game</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {gameOptions.length === 0 ? (
                <Text style={{ color: "#9ca3af", padding: 8 }}>No games found</Text>
              ) : (
                gameOptions.map((g) => (
                  <Pressable
                    key={g.slug}
                    onPress={() => {
                      setGame(g.label);
                      setGameSlug(g.slug);
                      setOpenGameList(false);
                    }}
                    style={[
                      styles.option,
                      game === g.label && { backgroundColor: "#eff6ff" },
                    ]}
                  >
                    <Text style={{ fontWeight: game === g.label ? "800" : "400", color: "#111827" }}>
                      {g.label}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function RowEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      <TextInput
        value={val}
        onChangeText={(t) => setVal(t.replace(/[^0-9]/g, "").slice(0, 2))}
        keyboardType="number-pad"
        style={[styles.input, { height: 36, minWidth: 70 }]}
        placeholder="00"
        placeholderTextColor="#9ca3af"
      />
      <Pressable style={[styles.btnSm, styles.btnGreen]} onPress={() => onSave(val)}>
        <Ionicons name="save" size={14} color="#fff" />
        <Text style={styles.btnSmText}>Save</Text>
      </Pressable>
      <Pressable style={[styles.btnSm, styles.btnGray]} onPress={onCancel}>
        <Ionicons name="close" size={14} color="#111827" />
        <Text style={[styles.btnSmText, { color: "#111827" }]}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screenPad: { paddingVertical: 16, paddingHorizontal: 8, alignItems: "center" },
  wrap: { width: "100%", maxWidth: 980, gap: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignSelf: "stretch",
  },
  field: { gap: 6 },
  label: { fontWeight: "700", color: "#374151" },
  input: {
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  head: {
    backgroundColor: "#6C2BD9",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  },
  th: { color: "#fff", fontWeight: "800", paddingVertical: 12, paddingHorizontal: 10 },
  td: { paddingHorizontal: 10, color: "#111827" },
  zebra: { backgroundColor: "#f0fdf4" },

  btn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    alignSelf: "flex-start",
  },
  btnGreen: { backgroundColor: "#6C2BD9" },
  btnGreenText: { color: "#fff", fontWeight: "800" },

  btnSm: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnSmText: { color: "#fff", fontWeight: "700" },
  btnYellow: { backgroundColor: "#facc15" },
  btnRed: { backgroundColor: "#ef4444" },
  btnGray: { backgroundColor: "#e5e7eb" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalSheet: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  option: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
});

const cardResStyles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: "600", minWidth: 60 },
  value: { flex: 1, fontSize: 14, color: "#111827" },
});
