import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  useWindowDimensions,
} from "react-native";
import { api } from "../lib/api"; // ✅ fixed path
import DateTimePicker from "@react-native-community/datetimepicker";

type DailyRow = { phone: string; username: string; amount: number };
type MonthlyRow = { phone: string; username: string; added: number; withdrawn: number };

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Helpers for date formats
const ddmmyyyyToISOStart = (s: string) => {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const ddmmyyyyToISOEnd = (s: string) => {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 23, 59, 59, 999);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const DIGITS = ["0","1","2","3","4","5","6","7","8","9"];
const pad2 = (n: number | string) => String(n).padStart(2, "0");

// Convert UI label -> slug (matches what bets.controller.js stores in gameId)
const mapGameForAPI = (g: string) =>
  g.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");


/** ✅ Transaction schema mapping
 * - Add = credit
 * - Withdraw = debit
 */
function isAddTx(t: any) {
  return String(t?.type || "").toLowerCase() === "credit";
}
function isWithdrawTx(t: any) {
  return String(t?.type || "").toLowerCase() === "debit";
}
function isSuccessTx(t: any) {
  return String(t?.status || "").toLowerCase() === "success";
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatMonthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
function monthRangeFromDate(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Return today's date as DD-MM-YYYY
function todayDDMMYYYY() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

type GameOpt = { label: string; slug: string };

const MAX_CONTENT = 1100;

export default function PaymentReportScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, MAX_CONTENT);

  // ------- Bet Report filters -------
  const [gameId, setGameId] = useState("");
  const [gameOptions, setGameOptions] = useState<GameOpt[]>([]);
  const [openGameDropdown, setOpenGameDropdown] = useState(false);
  const [fromDate, setFromDate] = useState(todayDDMMYYYY);
  const [toDate, setToDate] = useState(todayDDMMYYYY);

  // ✅ Month picker state (Month/Year selection via date picker)
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [monthLbl, setMonthLbl] = useState(formatMonthLabel(new Date()));
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // ------- Bet Report data -------
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // ------- Payment Report (REAL) -------
  const [todayAdds, setTodayAdds] = useState<DailyRow[]>([]);
  const [todayWithdraws, setTodayWithdraws] = useState<DailyRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  const totalAddToday = useMemo(() => todayAdds.reduce((s, r) => s + r.amount, 0), [todayAdds]);
  const totalWithdrawToday = useMemo(() => todayWithdraws.reduce((s, r) => s + r.amount, 0), [todayWithdraws]);

  const todayNetPL = useMemo(() => totalAddToday - totalWithdrawToday, [totalAddToday, totalWithdrawToday]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.games();
        const list: any[] = res?.games || res?.data || res?.rows || res?.items || [];
        setGameOptions(
          list.map((g: any) => ({
            label: String(g.name || g.gameName || g.slug || "").toUpperCase(),
            slug: mapGameForAPI(String(g.slug || g.gameId || g.name || "")),
          }))
        );
      } catch {
        setGameOptions([]);
      }
    })();
  }, []);

  const monthlyTotals = useMemo(() => {
    const add = monthlyRows.reduce((s, r) => s + r.added, 0);
    const wd = monthlyRows.reduce((s, r) => s + r.withdrawn, 0);
    return { add, wd };
  }, [monthlyRows]);

  const fetchReport = async () => {
    const fISO = ddmmyyyyToISOStart(fromDate);
    const tISO = ddmmyyyyToISOEnd(toDate);
    if (!fISO || !tISO) return Alert.alert("Date Error", "Use DD-MM-YYYY format (e.g. 24-08-2025).");
    try {
      setLoading(true);
      const gameClean = mapGameForAPI(String(gameId));
      const r: any = await (api as any).betReport(gameClean, fISO, tISO);

      const out: any = { ...r };

      if (Array.isArray(r?.jn)) {
        const m: Record<string, number> = {};
        for (const it of r.jn) {
          const key = pad2(parseInt(String(it?.number ?? it?.num ?? it?.key ?? it?.digit ?? 0), 10) || 0);
          m[key] = Number(it?.amount || 0);
        }
        out.jn = m;
      } else {
        out.jn = r?.jn || {};
      }

      const toMap10 = (list: any[]) => {
        const m: Record<string, number> = {};
        for (const it of list || []) {
          const k = pad2(parseInt(String(it?.digit ?? it?.number ?? it?.key ?? 0), 10) || 0);
          m[String(parseInt(k, 10))] = Number(it?.amount || 0);
        }
        return m;
      };
      out.andar = Array.isArray(r?.andar) ? toMap10(r.andar) : (r?.andar || {});
      out.bahar = Array.isArray(r?.bahar) ? toMap10(r.bahar) : (r?.bahar || {});

      if (!out.totals) {
        const jnAmt = Object.values(out.jn).reduce((s: number, v: any) => s + Number(v || 0), 0);
        const aAmt = Object.values(out.andar).reduce((s: number, v: any) => s + Number(v || 0), 0);
        const bAmt = Object.values(out.bahar).reduce((s: number, v: any) => s + Number(v || 0), 0);
        out.totals = { totalAmount: jnAmt + aAmt + bAmt, jnAmount: jnAmt, andarAmount: aAmt, baharAmount: bAmt };
      }

      setReport(out || null);
    } catch (e: any) {
      Alert.alert("Bet Report", e?.message || "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // Build 100-grid rows for Jantri (00-99)
  const jnRows = useMemo(() => {
    const jn = report?.jn || {};
    const all = Array.from({ length: 100 }, (_, i) => pad2(i)).map((k) => ({
      key: k,
      amount: Number(jn[k] || 0),
    }));
    const rows: Array<Array<{ key: string; amount: number }>> = [];
    for (let i = 0; i < all.length; i += 10) rows.push(all.slice(i, i + 10));
    return rows;
  }, [report]);

  const andar = report?.andar || {};
  const bahar = report?.bahar || {};
  const totals = report?.totals || { totalAmount: 0, jnAmount: 0, andarAmount: 0, baharAmount: 0 };

  // -------- REAL Payment Report Loaders --------
  const fetchTodayPayments = async () => {
    try {
      setLoading(true);

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const data: any = await api.ledger({
        from: start.toISOString(),
        to: end.toISOString(),
      });

      const txs: any[] = data?.rows || data?.ledger || data?.items || [];

      const addMap = new Map<string, DailyRow>();
      const wdMap = new Map<string, DailyRow>();

      for (const t of txs) {
        if (!isSuccessTx(t)) continue;

        const phone = String(t?.user?.phone || "");
        const username = String(t?.user?.username || "");
        const amt = Number(t?.amount || 0);

        const key = phone || username;
        if (!key) continue;

        if (isAddTx(t)) {
          const prev = addMap.get(key);
          addMap.set(key, {
            phone: phone || "-",
            username: username || "-",
            amount: (prev?.amount || 0) + amt,
          });
        } else if (isWithdrawTx(t)) {
          const prev = wdMap.get(key);
          wdMap.set(key, {
            phone: phone || "-",
            username: username || "-",
            amount: (prev?.amount || 0) + amt,
          });
        }
      }

      setTodayAdds(Array.from(addMap.values()));
      setTodayWithdraws(Array.from(wdMap.values()));

      // Total Balance (best-effort)
      try {
        const usersData: any = await api.users();
        const users: any[] = usersData?.rows || usersData?.users || usersData?.items || [];
        const sum = users.reduce((s, u) => s + Number(u?.wallet || 0), 0);
        setTotalBalance(sum);
      } catch {
        setTotalBalance(0);
      }
    } catch (e: any) {
      Alert.alert("Payment Report", e?.message || "Failed to load today's payments");
      setTodayAdds([]);
      setTodayWithdraws([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Month picker handler (Android dismiss safe)
  const onPickMonth = (event: any, selected?: Date) => {
    // Android: close on any change/dismiss
    if (Platform.OS !== "ios") setShowMonthPicker(false);

    // If dismissed, selected can be undefined
    if (event?.type === "dismissed" || !selected) return;

    // Use selected's month/year
    setMonthDate(selected);
    setMonthLbl(formatMonthLabel(selected));
  };

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);

      const { start, end } = monthRangeFromDate(monthDate);

      const data: any = await api.ledger({
        from: start.toISOString(),
        to: end.toISOString(),
      });

      const txs: any[] = data?.rows || data?.ledger || data?.items || [];
      const map = new Map<string, MonthlyRow>();

      for (const t of txs) {
        if (!isSuccessTx(t)) continue;

        const phone = String(t?.user?.phone || "");
        const username = String(t?.user?.username || "");
        const amt = Number(t?.amount || 0);

        const key = phone || username;
        if (!key) continue;

        const cur = map.get(key) || {
          phone: phone || "-",
          username: username || "-",
          added: 0,
          withdrawn: 0,
        };

        if (isAddTx(t)) cur.added += amt;
        else if (isWithdrawTx(t)) cur.withdrawn += amt;

        map.set(key, cur);
      }

      setMonthlyRows(Array.from(map.values()));
    } catch (e: any) {
      Alert.alert("Monthly Report", e?.message || "Failed to load monthly report");
      setMonthlyRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8f5ff" }}>
      <View style={[styles.container, { maxWidth: maxW }]}>
        {/* ---------- Top Filters + Total Balance ---------- */}
        <View style={styles.topRow}>
          <View style={styles.filterRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Game (name or ID)</Text>
              <Pressable
                onPress={() => setOpenGameDropdown(true)}
                style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
              >
                <Text style={{ color: gameId ? "#111827" : "#9ca3af" }}>
                  {gameId || "e.g. GAZIABAD or select"}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>▼</Text>
              </Pressable>
              <TextInput
                style={[styles.input, { marginTop: 4 }]}
                placeholder="Or type game name"
                placeholderTextColor="#9ca3af"
                value={gameId}
                onChangeText={setGameId}
                autoCapitalize="characters"
              />
              {openGameDropdown && (
                <Modal transparent visible animationType="fade">
                  <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", padding: 24 }}
                    onPress={() => setOpenGameDropdown(false)}
                  >
                    <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12, maxHeight: 400 }}>
                      <Text style={{ fontWeight: "800", marginBottom: 8 }}>Select Game</Text>
                      <ScrollView style={{ maxHeight: 320 }}>
                        {gameOptions.map((g) => (
                          <Pressable
                            key={g.slug}
                            style={{ paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 }}
                            onPress={() => {
                              setGameId(g.label);
                              setOpenGameDropdown(false);
                            }}
                          >
                            <Text style={{ fontWeight: gameId === g.label ? "800" : "400" }}>{g.label}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>From Date (DD-MM-YYYY)</Text>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="#9ca3af"
                value={fromDate}
                onChangeText={setFromDate}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>To Date (DD-MM-YYYY)</Text>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="#9ca3af"
                value={toDate}
                onChangeText={setToDate}
              />
            </View>

            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={fetchReport} disabled={loading}>
              <Text style={styles.btnPrimaryText}>{loading ? "Loading..." : "Show Report"}</Text>
            </Pressable>
          </View>

          <Text style={styles.totalBalance}>Total Balance: {inr(totalBalance)}</Text>
        </View>

        {/* ---------- BET REPORT (unchanged) ---------- */}
        {report && (
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>
              Bet Report • {report.gameId ?? gameId} •{" "}
              {new Date(report.from ?? ddmmyyyyToISOStart(fromDate)!).toLocaleDateString()} →{" "}
              {new Date(report.to ?? ddmmyyyyToISOEnd(toDate)!).toLocaleDateString()}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pill label="Total Bet Amount" value={inr(totals.totalAmount)} />
            <Pill label="Jantri + Notono" value={inr(totals.jnAmount)} />
              <Pill label="Andar" value={inr(totals.andarAmount)} />
              <Pill label="Bahar" value={inr(totals.baharAmount)} />
            </View>

            <View style={[styles.block, styles.blueOutline]}>
              <View style={[styles.blockHeader, { backgroundColor: "#6C2BD9" }]}>
                <Text style={styles.blockTitle}>Jantri (00-99)</Text>
              </View>
              {jnRows.map((row, idx) => (
                <View key={idx} style={styles.jnRow}>
                  {row.map((cell) => (
                    <View key={cell.key} style={styles.jnCell}>
                      <Text style={styles.jnKey}>{cell.key}</Text>
                      <Text style={styles.jnAmt}>{inr(cell.amount)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <View style={[styles.block, styles.greenOutline, { flex: 1, minWidth: 320 }]}>
                <View style={[styles.blockHeader, { backgroundColor: "#15803d" }]}>
                  <Text style={styles.blockTitle}>Andar</Text>
                </View>
                {DIGITS.map((d) => (
                  <View key={`a-${d}`} style={styles.abRow}>
                    <Text style={styles.abKey}>{d}</Text>
                    <Text style={styles.abAmt}>{inr(Number(andar[d] || 0))}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.block, styles.redOutline, { flex: 1, minWidth: 320 }]}>
                <View style={[styles.blockHeader, { backgroundColor: "#b91c1c" }]}>
                  <Text style={styles.blockTitle}>Bahar</Text>
                </View>
                {DIGITS.map((d) => (
                  <View key={`b-${d}`} style={styles.abRow}>
                    <Text style={styles.abKey}>{d}</Text>
                    <Text style={styles.abAmt}>{inr(Number(bahar[d] || 0))}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ---------- Payment Sections (REAL) ---------- */}
        <Pressable
          style={[styles.btn, styles.btnPrimary, { alignSelf: "flex-start" }]}
          onPress={fetchTodayPayments}
          disabled={loading}
        >
          <Text style={styles.btnPrimaryText}>{loading ? "Loading..." : "Load Today's Payments"}</Text>
        </Pressable>
        <Text style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
          \"Add\" means money credited to user wallets; \"Withdraw\" means money debited from wallets today.
        </Text>

        <View style={[styles.block, styles.greenOutline]}>
          <View style={[styles.blockHeader, styles.greenHeader]}>
            <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
            <Text style={styles.blockTitle}>Today's Add Payments</Text>
          </View>
          <TableSimple
            head={["Phone", "Username", "Added (₹)"]}
            rows={todayAdds.map((r) => [r.phone, r.username, inr(r.amount)])}
            empty="No Add Data"
          />
          <View style={[styles.tr, styles.totalRow]}>
            <Text style={[styles.td, { flex: 2 + 2, fontWeight: "800" }]}>Total:</Text>
            <Text style={[styles.td, { flex: 1.6, fontWeight: "800" }]}>{inr(totalAddToday)}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#f1f5f9" }}>
            <Text style={{ fontWeight: "800", color: "#111827" }}>
              Today's Wallet P&L{" "}
              <Text style={{ fontWeight: "900", color: todayNetPL >= 0 ? "#16a34a" : "#b91c1c" }}>
                {inr(todayNetPL)}
              </Text>
            </Text>
            <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Calculated as total added minus total withdrawn for today.
            </Text>
          </View>
        </View>

        <View style={[styles.block, styles.redOutline]}>
          <View style={[styles.blockHeader, styles.redHeader]}>
            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
            <Text style={styles.blockTitle}>Today's Withdraw Payments</Text>
          </View>
          <TableSimple
            head={["Phone", "Username", "Withdrawn (₹)"]}
            rows={todayWithdraws.map((r) => [r.phone, r.username, inr(r.amount)])}
            empty="No Withdraw Data"
          />
          <View style={[styles.tr, styles.totalRow]}>
            <Text style={[styles.td, { flex: 2 + 2, fontWeight: "800" }]}>Total:</Text>
            <Text style={[styles.td, { flex: 1.6, fontWeight: "800" }]}>{inr(totalWithdrawToday)}</Text>
          </View>
        </View>

        {/* ✅ Month picker (calendar) */}
        <View style={styles.monthRow}>
          <View style={[styles.field, { flex: 1, maxWidth: 320 }]}>
            <Text style={styles.label}>Select Month</Text>

            <Pressable onPress={() => setShowMonthPicker(true)}>
              <View pointerEvents="none">
                <TextInput
                  style={styles.input}
                  placeholder="Month, Year"
                  placeholderTextColor="#9ca3af"
                  value={monthLbl}
                  editable={false}
                />
              </View>
            </Pressable>

            {/* iOS close button so user can dismiss */}
            {Platform.OS === "ios" && showMonthPicker ? (
              <Pressable onPress={() => setShowMonthPicker(false)} style={{ marginTop: 8, alignSelf: "flex-start" }}>
                <Text style={{ color: "#6C2BD9", fontWeight: "800" }}>Done</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable style={[styles.btn, styles.btnGreen]} onPress={fetchMonthlyReport} disabled={loading}>
            <Text style={styles.btnGreenText}>{loading ? "Loading..." : "Show Monthly Report"}</Text>
          </Pressable>
        </View>

        {showMonthPicker && (
          <DateTimePicker
            value={monthDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPickMonth}
          />
        )}

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
              Monthly Payment Report ({monthLbl})
            </Text>
          </View>
          <TableSimple
            head={["Phone", "Username", "Added (₹)", "Withdrawn (₹)"]}
            rows={monthlyRows.map((r) => [r.phone, r.username, inr(r.added), inr(r.withdrawn)])}
          />
          <View style={[styles.tr, styles.totalRow]}>
            <Text style={[styles.td, { flex: 2 + 2, fontWeight: "800" }]}>Total:</Text>
            <Text style={[styles.td, { flex: 1.6, fontWeight: "800" }]}>{inr(monthlyTotals.add)}</Text>
            <Text style={[styles.td, { flex: 1.8, fontWeight: "800" }]}>{inr(monthlyTotals.wd)}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#f1f5f9" }}>
            <Text style={{ fontWeight: "800", color: "#111827" }}>
              Approx. Admin P&L (Wallet){" "}
              <Text style={{ fontWeight: "900", color: monthlyTotals.add - monthlyTotals.wd >= 0 ? "#16a34a" : "#b91c1c" }}>
                {inr(monthlyTotals.add - monthlyTotals.wd)}
              </Text>
            </Text>
            <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Calculated as total added minus total withdrawn for this month.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ backgroundColor: "#e5e7eb", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ fontWeight: "800", color: "#111827" }}>{label}: {value}</Text>
    </View>
  );
}

function TableSimple({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: string[][];
  empty?: string;
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.tr, styles.trHead]}>
        {head.map((h, i) => (
          <Text key={i} style={[styles.th, { flex: i === head.length - 1 ? 1.6 : 2 }]}>{h}</Text>
        ))}
      </View>
      {rows.length ? (
        rows.map((r, i) => (
          <View key={i} style={styles.tr}>
            {r.map((c, j) => (
              <Text key={j} style={[styles.td, { flex: j === head.length - 1 ? 1.6 : 2 }]}>{c}</Text>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{empty || "No Data"}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, maxWidth: 1200, alignSelf: "center" },

  topRow: { gap: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-end" },
  field: { gap: 6 },
  label: { fontWeight: "700", color: "#374151" },
  input: {
    height: 40, backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#e5e7eb", minWidth: 160,
  },
  btn: { height: 40, paddingHorizontal: 16, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: "#6C2BD9" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },

  totalBalance: { alignSelf: "flex-end", fontWeight: "900", color: "#059669", fontSize: 18 },

  block: { borderRadius: 8, overflow: "hidden", backgroundColor: "#ffffff" },
  greenOutline: { borderWidth: 1, borderColor: "#22c55e" },
  redOutline: { borderWidth: 1, borderColor: "#ef4444" },
  blueOutline: { borderWidth: 1, borderColor: "#6C2BD9" },

  blockHeader: { paddingVertical: 10, paddingHorizontal: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  greenHeader: { backgroundColor: "#15803d" },
  redHeader: { backgroundColor: "#b91c1c" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  blockTitle: { color: "#fff", fontWeight: "800" },

  table: { borderTopWidth: 1, borderColor: "#e5e7eb" },
  tr: {
    flexDirection: "row", alignItems: "center", minHeight: 44,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#ffffff",
  },
  trHead: { backgroundColor: "#f8fafc" },
  th: { paddingVertical: 10, paddingHorizontal: 10, fontWeight: "800", color: "#111827" },
  td: { paddingVertical: 10, paddingHorizontal: 10, color: "#111827" },
  emptyRow: { paddingVertical: 16, alignItems: "center" },
  emptyText: { color: "#ef4444", fontWeight: "700" },
  totalRow: { backgroundColor: "#e5e7eb" },

  monthRow: { marginTop: 8, flexDirection: "row", gap: 10, alignItems: "flex-end", flexWrap: "wrap" },
  btnGreen: { backgroundColor: "#15803d", paddingHorizontal: 18, height: 40, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  btnGreenText: { color: "#fff", fontWeight: "800" },

  jnRow: { flexDirection: "row", flexWrap: "nowrap" },
  jnCell: { width: "10%", minWidth: 80, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderColor: "#e5e7eb" },
  jnKey: { fontWeight: "800", color: "#111827" },
  jnAmt: { color: "#111827" },

  abRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: "#e5e7eb" },
  abKey: { fontWeight: "800", color: "#111827" },
  abAmt: { color: "#111827" },
});
