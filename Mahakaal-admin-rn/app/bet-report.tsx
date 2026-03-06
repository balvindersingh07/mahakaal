// app/bet-report.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { pickBetType, pickNumber } from "../lib/betDisplay";

type Cell = { bets: number; amount: number };
type GridData = Record<string, Cell>;
type GameOption = { label: string; slug: string };

// Convert UI label -> slug (matches what bets.controller.js stores in gameId)
const gameForAPI = (g: string) =>
  g.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const fmtDMY = (d: Date) =>
  `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
const fmtTime = (d: Date) => {
  let h: number | string = d.getHours();
  const m = pad2(d.getMinutes());
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ap}`;
};

// empty grids
const emptyHundreds = (): GridData => {
  const o: GridData = {};
  for (let i = 0; i < 100; i++) o[pad2(i)] = { bets: 0, amount: 0 };
  return o;
};
const emptyTens = (): GridData => {
  const o: GridData = {};
  for (let i = 0; i < 10; i++) o[pad2(i)] = { bets: 0, amount: 0 };
  return o;
};

// merge helpers
const setDatePart = (base: Date, picked: Date) => {
  const d = new Date(base);
  d.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return d;
};
const setTimePart = (base: Date, picked: Date) => {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return d;
};

// web fallbacks (prompt)
const parseDMY = (s: string) => {
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const d = new Date();
  d.setFullYear(+m[3], +m[2] - 1, +m[1]);
  d.setHours(0, 0, 0, 0);
  return d;
};
const parseTime = (s: string) => {
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = +m[1];
  const min = +m[2];
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
};

const MAX_CONTENT = 1240;

export default function BetReportScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 24, MAX_CONTENT);

  const [game, setGame] = useState("");        // display label
  const [gameSlug, setGameSlug] = useState(""); // slug sent to API

  // Games loaded from backend
  const [gameOptions, setGameOptions] = useState<GameOption[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setGamesLoading(true);
        const res: any = await api.games();
        const list: any[] = res?.games || res?.data || res?.rows || res?.items || [];
        const opts: GameOption[] = list.map((g: any) => ({
          label: String(g.name || g.gameName || g.slug || "").toUpperCase(),
          slug: String(g.slug || g.gameId || gameForAPI(g.name || "")),
        }));
        setGameOptions(opts);
        // auto-select first game
        if (opts.length > 0 && !game) {
          setGame(opts[0].label);
          setGameSlug(opts[0].slug);
        }
      } catch {
        // fallback: keep empty, user sees no selection
      } finally {
        setGamesLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [fromDT, setFromDT] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [toDT, setToDT] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return d;
  });

  const [showFromDate, setShowFromDate] = useState(false);
  const [showFromTime, setShowFromTime] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [showToTime, setShowToTime] = useState(false);
  const [openGame, setOpenGame] = useState(false);
  const [loading, setLoading] = useState(false);

  const [jnData, setJnData] = useState<GridData>(() => emptyHundreds());
  const [andarData, setAndarData] = useState<GridData>(() => emptyTens());
  const [baharData, setBaharData] = useState<GridData>(() => emptyTens());

  const [winnersModal, setWinnersModal] = useState(false);
  const [winnersList, setWinnersList] = useState<any[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const reportRef = useRef<ViewShot>(null);

  const totals = useMemo(() => {
    const sum = (g: GridData) =>
      Object.values(g).reduce(
        (a, c) => ({ bets: a.bets + c.bets, amount: a.amount + c.amount }),
        { bets: 0, amount: 0 }
      );
    const j = sum(jnData),
      a = sum(andarData),
      b = sum(baharData);
    return {
      totalAmount: j.amount + a.amount + b.amount,
      jnAmount: j.amount,
      andarAmount: a.amount,
      baharAmount: b.amount,
    };
  }, [jnData, andarData, baharData]);

  // API list -> grid
  const fillHundreds = (list: any[] = []) => {
    const base = emptyHundreds();
    list.forEach((it) => {
      const key =
        it?.number ?? it?.num ?? it?.key ?? it?.k ?? it?.digit ?? it?.d ?? "";
      const k = pad2(parseInt(String(key), 10) || 0);
      base[k] = { bets: Number(it?.bets || 0), amount: Number(it?.amount || 0) };
    });
    return base;
  };
  const fillTens = (list: any[] = []) => {
    const base = emptyTens();
    list.forEach((it) => {
      const key =
        it?.digit ?? it?.number ?? it?.num ?? it?.key ?? it?.k ?? "";
      const k = pad2(parseInt(String(key), 10) || 0);
      base[k] = { bets: Number(it?.bets || 0), amount: Number(it?.amount || 0) };
    });
    return base;
  };

  const onShow = async () => {
    if (!gameSlug) return Alert.alert("Select Game", "Please choose a game first.");
    try {
      setLoading(true);
      const res = await api.betReport(
        gameSlug,                      // slug from API, exact match
        fromDT.toISOString(),
        toDT.toISOString()
      ); // expected: { jn:[], andar:[], bahar:[] }
      setJnData(fillHundreds(res?.jn));
      setAndarData(fillTens(res?.andar));
      setBaharData(fillTens(res?.bahar));
    } catch (e: any) {
      Alert.alert("Bet Report", e?.message || "Failed to fetch");
      setJnData(emptyHundreds());
      setAndarData(emptyTens());
      setBaharData(emptyTens());
    } finally {
      setLoading(false);
    }
  };

  // --- open handlers (with web prompt fallback) ---
  const openFromDate = () => {
    if (Platform.OS === "web") {
      const v = prompt("Enter From Date (DD-MM-YYYY):", fmtDMY(fromDT));
      const d = v ? parseDMY(v) : null;
      if (d) setFromDT((prev) => setDatePart(prev, d));
    } else setShowFromDate(true);
  };
  const openFromTime = () => {
    if (Platform.OS === "web") {
      const v = prompt("Enter From Time (hh:mm AM/PM):", fmtTime(fromDT));
      const d = v ? parseTime(v) : null;
      if (d) setFromDT((prev) => setTimePart(prev, d));
    } else setShowFromTime(true);
  };
  const openToDate = () => {
    if (Platform.OS === "web") {
      const v = prompt("Enter To Date (DD-MM-YYYY):", fmtDMY(toDT));
      const d = v ? parseDMY(v) : null;
      if (d) setToDT((prev) => setDatePart(prev, d));
    } else setShowToDate(true);
  };
  const openToTime = () => {
    if (Platform.OS === "web") {
      const v = prompt("Enter To Time (hh:mm AM/PM):", fmtTime(toDT));
      const d = v ? parseTime(v) : null;
      if (d) setToDT((prev) => setTimePart(prev, d));
    } else setShowToTime(true);
  };

  const handleScreenshot = useCallback(async () => {
    try {
      let uri: string | undefined;

      if (Platform.OS === "web") {
        // Web: use html2canvas (ViewShot doesn't support web properly)
        if (typeof document !== "undefined") {
          const el = document.getElementById("bet-report-capture");
          if (el) {
            const { default: html2canvas } = await import("html2canvas");
            const canvas = await html2canvas(el, {
              backgroundColor: "#f8f5ff",
              scale: 1,
              useCORS: true,
              allowTaint: true,
              logging: false,
            });
            uri = canvas.toDataURL("image/png");
          }
        }
        if (uri) {
          const a = document.createElement("a");
          a.href = uri;
          a.download = `bet-report-${gameSlug || "report"}-${fmtDMY(fromDT)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
        throw new Error("Capture element not found. Try scrolling to show the report, then click Screenshot again.");
      } else {
        // Native: ViewShot capture or captureRef
        const ref = reportRef.current;
        if (ref && typeof (ref as any).capture === "function") {
          uri = await (ref as any).capture();
        } else if (ref && typeof captureRef === "function") {
          uri = await captureRef(ref, { format: "png", quality: 1 });
        }
        if (!uri) throw new Error("Capture failed");
        const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
        const Sharing = await import("expo-sharing");
        const isAvailable = await Sharing.default.isAvailableAsync();
        if (isAvailable) {
          await Sharing.default.shareAsync(fileUri, {
            mimeType: "image/png",
            dialogTitle: "Save Bet Report",
          });
        } else {
          Alert.alert("Screenshot", "Image captured. Save from your gallery or files.");
        }
      }
    } catch (e: any) {
      Alert.alert("Screenshot", e?.message || "Capture failed. Try Print Screen or device screenshot.");
    }
  }, [gameSlug, fromDT]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8f5ff" }}>
      <View style={[styles.wrap, { maxWidth: maxW }]}>
        <Text style={styles.title}>
          {game || "Select Game"} - <Text style={{ fontWeight: "700" }}>Bet Report</Text>
        </Text>

        <Text style={styles.subtitle}>
          After checking this report, you can tap{" "}
          <Text style={{ fontWeight: "900" }}>View Winners</Text> to see all winning bets for this
          time range.
        </Text>

        {/* Filters */}
        <View style={styles.filters}>
          <View style={styles.fieldWide}>
            <Pressable
              style={[styles.input, styles.select]}
              onPress={() => setOpenGame(true)}
              disabled={gamesLoading}
            >
              <Text style={{ color: game ? "#111827" : "#9ca3af" }}>
                {gamesLoading ? "Loading..." : game || "Select Game"}
              </Text>
              {gamesLoading
                ? <ActivityIndicator size="small" color="#6b7280" />
                : <Ionicons name="chevron-down" size={16} color="#6b7280" />
              }
            </Pressable>
          </View>

          {/* From */}
          <PickerInput value={fmtDMY(fromDT)} icon="calendar-outline" onPress={openFromDate} />
          <PickerInput value={fmtTime(fromDT)} icon="time-outline" onPress={openFromTime} />

          {/* To */}
          <PickerInput value={fmtDMY(toDT)} icon="calendar-outline" onPress={openToDate} />
          <PickerInput value={fmtTime(toDT)} icon="time-outline" onPress={openToTime} />

          <Pressable
            style={[styles.showBtn, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onShow}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.showBtnText}>Show</Text>}
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#6C2BD9" }]}
            onPress={async () => {
              if (!gameSlug) return Alert.alert("Select Game", "Choose a game and tap Show first.");
              setWinnersModal(true);
              setWinnersLoading(true);
              setWinnersList([]);
              try {
                const res = await api.bets({
                  status: "won",
                  gameId: gameSlug,
                  from: fromDT.toISOString(),
                  to: toDT.toISOString(),
                });
                const list = res?.rows || res?.bets || res?.items || [];
                setWinnersList(list);
              } catch (e: any) {
                Alert.alert("View Winners", e?.message || "Failed to load winners");
                setWinnersList([]);
              } finally {
                setWinnersLoading(false);
              }
            }}
          >
            <Ionicons name="trophy" size={16} color="#fff" />
            <Text style={styles.actionText}>View Winners</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#6b7280" }]}
            onPress={handleScreenshot}
          >
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.actionText}>Screenshot</Text>
          </Pressable>
        </View>

        {/* Native pickers */}
        {showFromDate && (
          <DateTimePicker
            value={fromDT}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, d) => {
              setShowFromDate(false);
              if (d) setFromDT((prev) => setDatePart(prev, d));
            }}
          />
        )}
        {showFromTime && (
          <DateTimePicker
            value={fromDT}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, d) => {
              setShowFromTime(false);
              if (d) setFromDT((prev) => setTimePart(prev, d));
            }}
          />
        )}
        {showToDate && (
          <DateTimePicker
            value={toDT}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, d) => {
              setShowToDate(false);
              if (d) setToDT((prev) => setDatePart(prev, d));
            }}
          />
        )}
        {showToTime && (
          <DateTimePicker
            value={toDT}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, d) => {
              setShowToTime(false);
              if (d) setToDT((prev) => setTimePart(prev, d));
            }}
          />
        )}

        {Platform.OS === "web" ? (
          <div id="bet-report-capture" style={{ backgroundColor: "#f8f5ff", padding: 12 } as React.CSSProperties}>
            <ViewShot ref={reportRef} options={{ format: "png", quality: 1 }} style={{ backgroundColor: "#f8f5ff" }}>
              <View style={styles.chipsRow}>
                <Chip label={`Total Amount: ₹${totals.totalAmount}`} />
                <Chip label={`Jantri + Notono: ₹${totals.jnAmount}`} dotColor="#fbbf24" />
                <Chip label={`Andar: ₹${totals.andarAmount}`} dotColor="#3b82f6" />
                <Chip label={`Bahar: ₹${totals.baharAmount}`} dotColor="#f59e0b" />
              </View>
              <View style={styles.hr} />
              <Text style={styles.section}>Jantri + Notono</Text>
              <NumberGrid data={jnData} />
              <View style={styles.hr} />
              <Text style={styles.section}>Andar</Text>
              <NumberGrid data={andarData} onlyTen />
              <View style={styles.hr} />
              <Text style={styles.section}>Bahar</Text>
              <NumberGrid data={baharData} onlyTen />
            </ViewShot>
          </div>
        ) : (
          <View nativeID="bet-report-capture" collapsable={false} style={{ backgroundColor: "#f8f5ff" }}>
            <ViewShot ref={reportRef} options={{ format: "png", quality: 1 }} style={{ backgroundColor: "#f8f5ff" }}>
              <View style={styles.chipsRow}>
                <Chip label={`Total Amount: ₹${totals.totalAmount}`} />
                <Chip label={`Jantri + Notono: ₹${totals.jnAmount}`} dotColor="#fbbf24" />
                <Chip label={`Andar: ₹${totals.andarAmount}`} dotColor="#3b82f6" />
                <Chip label={`Bahar: ₹${totals.baharAmount}`} dotColor="#f59e0b" />
              </View>
              <View style={styles.hr} />
              <Text style={styles.section}>Jantri + Notono</Text>
              <NumberGrid data={jnData} />
              <View style={styles.hr} />
              <Text style={styles.section}>Andar</Text>
              <NumberGrid data={andarData} onlyTen />
              <View style={styles.hr} />
              <Text style={styles.section}>Bahar</Text>
              <NumberGrid data={baharData} onlyTen />
            </ViewShot>
          </View>
        )}
      </View>

      {/* Winners Modal */}
      <Modal
        visible={winnersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setWinnersModal(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setWinnersModal(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontWeight: "800", fontSize: 18 }}>Winning Bets</Text>
              <Pressable onPress={() => setWinnersModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
              {game || "Game"} • {fmtDMY(fromDT)} {fmtTime(fromDT)} – {fmtDMY(toDT)} {fmtTime(toDT)}
            </Text>
            {winnersLoading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} />
            ) : winnersList.length === 0 ? (
              <Text style={{ color: "#9ca3af", padding: 16 }}>No winning bets in this range</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {winnersList.map((b: any) => (
                  <View key={b._id} style={[styles.option, { flexDirection: "column", alignItems: "flex-start", gap: 4 }]}>
                    <Text style={{ fontWeight: "700" }}>
                      {b?.user?.username || b?.user?.phone || "User"} • ₹{Number(b?.total || 0)} • Win: ₹{Number(b?.winAmount || 0)}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      {b?.gameName || b?.gameId} • {pickBetType(b)} • {pickNumber(b)} • {new Date(b?.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Game dropdown */}
      <Modal transparent visible={openGame} animationType="fade" onRequestClose={() => setOpenGame(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenGame(false)}>
          <View style={styles.sheet}>
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
                      setOpenGame(false);
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

/* ----- small atoms ----- */
function Chip({ label, dotColor = "#f59e0b" }: { label: string; dotColor?: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name="ellipse" size={10} color={dotColor} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}
function NumberGrid({ data, onlyTen = false }: { data: GridData; onlyTen?: boolean }) {
  const keys = useMemo(
    () => (onlyTen ? [...Array(10)].map((_, i) => pad2(i)) : [...Array(100)].map((_, i) => pad2(i))),
    [onlyTen]
  );
  return (
    <View style={styles.gridWrap}>
      {keys.map((k) => (
        <View key={k} style={styles.cell}>
          <Text style={styles.cellNum}>{k}</Text>
          <Text style={styles.cellBold}>{data[k]?.amount ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}
function PickerInput({
  value,
  icon,
  onPress,
}: {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.input, styles.select]} onPress={onPress}>
      <Text style={{ color: "#111827" }}>{value}</Text>
      <Ionicons name={icon} size={16} color="#6b7280" />
    </Pressable>
  );
}

/* ----- styles ----- */
const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 1240, alignSelf: "center", padding: 12, gap: 12 },
  title: { textAlign: "center", fontSize: 22, fontWeight: "900", color: "#111827" },
  subtitle: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  fieldWide: { width: 220 },
  input: {
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 160,
  },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  showBtn: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#6C2BD9",
    alignItems: "center",
    justifyContent: "center",
  },
  showBtnText: { color: "#fff", fontWeight: "800" },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fde68a",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  chipText: { fontWeight: "800", color: "#111827" },

  hr: { height: 1, backgroundColor: "#d1d5db", marginVertical: 8, width: "100%" },
  section: { textAlign: "center", fontWeight: "800", color: "#111827", marginBottom: 8 },

  gridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" },
  cell: {
    width: 62,
    height: 62,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cellNum: { color: "#ef4444", fontWeight: "800", fontSize: 12 },
  cellBold: { fontWeight: "900", color: "#111827" },
  cellThin: { color: "#111827" },

  // modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: { width: 320, backgroundColor: "#fff", borderRadius: 12, padding: 12, gap: 6 },
  option: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
});
