// Mahakaal-rn/src/screens/statement/StatementScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../api";
import { THEME } from "../../theme";

const LOGO = require("../../../assets/icon-512.png");
const APP_BG = THEME.bg;

const KIND_ICON = {
  deposit: { name: "add-circle-outline", tint: "#16a34a" },
  add: { name: "add-circle-outline", tint: "#16a34a" },
  win: { name: "trophy-outline", tint: "#16a34a" },
  prize: { name: "trophy-outline", tint: "#16a34a" },

  withdraw: { name: "remove-circle-outline", tint: "#ef4444" },
  payout: { name: "card-outline", tint: "#ef4444" },
  bet: { name: "cash-outline", tint: "#ef4444" },
  stake: { name: "cash-outline", tint: "#ef4444" },

  refund: { name: "swap-vertical", tint: "#0ea5e9" },
  adjust: { name: "swap-vertical", tint: "#0ea5e9" },
  other: { name: "receipt-outline", tint: "#6b7280" },
};

function inr(x) {
  const n = Number(x) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(s) {
  const d = s ? new Date(s) : null;
  if (!d || isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} • ${time}`;
}

const normId = (x) => String(x || "").trim();

function normalizeRow(raw) {
  const id = normId(raw._id || raw.id || raw.txnId || raw.reference || raw.ref || raw.code);

  const at = raw.createdAt || raw.time || raw.timestamp || raw.date || null;

  let delta = null;

  if (raw.delta != null) {
    delta = Number(raw.delta);
  } else if (raw.change != null) {
    delta = Number(raw.change);
  } else if (raw.amount != null) {
    const amt = Number(raw.amount);
    const dir = String(raw.direction || raw.dir || raw.type || "").toLowerCase();
    if (dir === "credit") delta = +amt;
    else if (dir === "debit") delta = -amt;
    else delta = amt;
  } else {
    delta = 0;
  }

  const kindRaw = raw.kind || raw.type || raw.category || raw.action || raw.txnType || "";
  let kind = String(kindRaw || "other").toLowerCase();

  const dir2 = String(raw.direction || "").toLowerCase();
  if (!kindRaw && (dir2 === "credit" || dir2 === "debit")) {
    kind = dir2 === "credit" ? "deposit" : "withdraw";
  }

  const aliasMap = {
    credit: "deposit",
    debit: "withdraw",
    winning: "win",
    withdrawl: "withdraw",
    withdrawal: "withdraw",
    payment: "deposit",
    topup: "deposit",
    recharge: "deposit",
  };
  kind = aliasMap[kind] || kind;

  let status = String(raw.status || raw.state || "success").toLowerCase();
  if (["approved", "paid", "done", "success"].includes(status)) status = "success";
  if (["pending", "hold"].includes(status)) status = "pending";
  if (["rejected", "failed", "cancelled", "canceled"].includes(status)) status = "failed";

  const note = raw.note || raw.remark || raw.reason || raw.message || raw.description || "";

  const balanceAfter = raw.balanceAfter ?? raw.after ?? raw.walletAfter ?? raw.balance ?? undefined;

  return {
    id,
    kind,
    delta: Number.isFinite(delta) ? delta : 0,
    status,
    note: String(note || ""),
    at,
    balanceAfter: Number(balanceAfter ?? NaN),
  };
}

const goBack = (nav) => {
  if (nav?.canGoBack?.()) nav.goBack();
  else nav?.navigate?.("MainTabs", { screen: "Wallet" });
};

export default function StatementScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(null);
  const [err, setErr] = useState("");

  const fetchAll = async () => {
    setErr("");
    try {
      setLoading(true);

      try {
        const w = await API.wallet();
        const d = w?.data ?? w;
        const val = d?.wallet ?? d?.balance ?? d?.amount ?? d;
        if (val != null) setBalance(Number(val) || 0);
      } catch {}

      const r = await API.transactions();
      const d = r?.data ?? r;

      const list =
        Array.isArray(d) ? d :
        Array.isArray(d?.rows) ? d.rows :
        Array.isArray(d?.transactions) ? d.transactions :
        Array.isArray(d?.items) ? d.items :
        [];

      const normalized = list.map(normalizeRow).sort((a, b) => {
        const ta = a.at ? new Date(a.at).getTime() : 0;
        const tb = b.at ? new Date(b.at).getTime() : 0;
        return tb - ta;
      });

      setItems(normalized);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed to load statement.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useAutoRefresh(fetchAll, { intervalMs: 15000 });

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  };

  const totalIn = useMemo(
    () => items.filter((x) => x.delta > 0).reduce((s, x) => s + x.delta, 0),
    [items]
  );
  const totalOut = useMemo(
    () => items.filter((x) => x.delta < 0).reduce((s, x) => s + Math.abs(x.delta), 0),
    [items]
  );

  const renderRow = ({ item }) => {
    const icon = KIND_ICON[item.kind] || KIND_ICON.other;
    const positive = item.delta > 0;
    const negative = item.delta < 0;

    const statusColor =
      item.status === "pending" ? "#9ca3af" :
      item.status === "failed" ? "#ef4444" : "#16a34a";

    return (
      <View style={styles.card}>
        <View style={styles.leftIcon}>
          <Ionicons name={icon.name} size={22} color={icon.tint} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowTop}>
            <Text style={styles.kind} numberOfLines={1}>
              {String(item.kind || "other").toUpperCase()}{" "}
              {item.status !== "success" ? `• ${item.status}` : ""}
            </Text>

            <Text style={[styles.amt, positive && styles.amtIn, negative && styles.amtOut]} numberOfLines={1}>
              {positive ? "+" : negative ? "-" : ""}
              {inr(Math.abs(item.delta))}
            </Text>
          </View>

          {!!item.note && (
            <Text style={styles.note} numberOfLines={2}>
              {item.note}
            </Text>
          )}

          {/* Bottom row: date | Ref (truncates) | Bal */}
          <View style={styles.rowBottom}>
            <Text style={[styles.meta, styles.metaDate, { color: statusColor }]} numberOfLines={1}>
              {fmtDate(item.at)}
            </Text>
            {!!item.id && (
              <TouchableOpacity
                onLongPress={() => Alert.alert("Reference", item.id)}
                activeOpacity={0.7}
                style={styles.refWrap}
              >
                <Text style={[styles.meta, styles.metaRef]} numberOfLines={1}>
                  Ref: {item.id.length > 12 ? `${item.id.slice(0, 10)}…` : item.id}
                </Text>
              </TouchableOpacity>
            )}
            {Number.isFinite(item.balanceAfter) && (
              <Text style={[styles.meta, styles.metaBal]} numberOfLines={1}>
                Bal: {inr(item.balanceAfter)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = (
    <View style={styles.container}>
      {/* Header with single back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack(navigation)} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={{ width: 40 }} />
      </View>

      {/* Balance & Summary - aligned row */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel} numberOfLines={1}>Available Balance</Text>
          <Text style={styles.summaryVal} numberOfLines={1}>
            {balance == null ? "—" : inr(balance)}
          </Text>
        </View>

        <View style={styles.summaryRight}>
          <View style={styles.summarySplit}>
            <Text style={styles.splitSmall}>In</Text>
            <Text style={[styles.splitVal, { color: "#16a34a" }]}>{inr(totalIn)}</Text>
          </View>
          <View style={styles.summarySplit}>
            <Text style={styles.splitSmall}>Out</Text>
            <Text style={[styles.splitVal, { color: "#ef4444" }]}>{inr(totalOut)}</Text>
          </View>
        </View>
      </View>

      {!!err && (
        <Text style={styles.errText} numberOfLines={2}>
          {err}
        </Text>
      )}

      {/* spacing between summary and list */}
      <View style={{ height: 8 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {loading ? (
        <View style={[styles.wrap, { paddingTop: 20 }]}>
          {ListHeader}
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={styles.wrap}
          data={items}
          keyExtractor={(it, idx) => it.id || String(idx)}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No payment records found.</Text>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },
  wrap: { flex: 1, backgroundColor: APP_BG },

  // ✅ centered container for tablet/web
  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: APP_BG,
  },
  backBtn: { padding: 8, marginLeft: 4 },
  logo: { width: 72, height: 72, borderRadius: 36 },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryLeft: { flex: 1, minWidth: 0 },
  summaryLabel: { color: "#64748b", fontWeight: "700", fontSize: 13 },
  summaryVal: { fontSize: 22, fontWeight: "900", color: "#0f172a", marginTop: 2 },

  summaryRight: { flexDirection: "row", alignItems: "center", gap: 20 },
  summarySplit: { alignItems: "flex-end" },
  splitSmall: { color: "#6b7280", fontWeight: "700", fontSize: 12 },
  splitVal: { fontWeight: "900", fontSize: 15, marginTop: 2 },

  errText: { color: "#ef4444", textAlign: "center", marginTop: 4, fontWeight: "700" },

  // ✅ list aligns with header container - same maxWidth, centered
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 12,
    alignItems: "stretch",
    alignSelf: "center",
    maxWidth: 560,
    width: "100%",
  },

  card: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  leftIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#f1f5f9",
  },

  rowTop: { flexDirection: "row", alignItems: "center" },
  kind: { flex: 1, fontWeight: "800", color: "#111827", marginRight: 8 },
  amt: { fontWeight: "900" },
  amtIn: { color: "#16a34a" },
  amtOut: { color: "#ef4444" },

  note: { marginTop: 2, color: "#334155" },

  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  meta: { color: "#6b7280", fontSize: 11 },
  metaDate: { flexShrink: 0, minWidth: 90 },
  refWrap: { flex: 1, minWidth: 0 },
  metaRef: { textDecorationLine: "underline" },
  metaBal: { flexShrink: 0, marginLeft: "auto" },

  empty: { color: "#ef4444", textAlign: "center", marginTop: 8 },
});
