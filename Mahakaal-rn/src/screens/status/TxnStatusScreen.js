// src/screens/status/TxnStatusScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Image,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../api";
import { useAutoRefresh } from "../../hooks/useAutoRefresh"; // ✅ use your API helpers

const LOGO = require("../../../assets/icon-512.png");

// ⚠️ Apna WhatsApp number (country code naal)
const ADMIN_WA_NUMBER =
  process.env.EXPO_PUBLIC_ADMIN_WA ||
  "+919784903092"; // fallback to the number we used elsewhere

const COLORS = {
  bg: "#f8f5ff",
  card: "#ffffff",
  line: "#DCF8C6",
  txt: "#111827",
  sub: "#6b7280",
  green: "#25D366",
  red: "#dc2626",
  amber: "#f59e0b",
  chip: "#6C2BD9",
};

const fmt = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "";
  const dd = d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  const tt = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dd}, ${tt}`;
};

function Chip({ label, onPress, active, tone = "chip" }) {
  const bg =
    tone === "green" ? COLORS.green :
    tone === "red" ? COLORS.red :
    tone === "amber" ? COLORS.amber :
    "#0b2545";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, { backgroundColor: bg, opacity: active ? 1 : 0.5 }]}
    >
      <Text style={styles.chipTxt} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ----------------------- Helpers ----------------------- */
const cleanPhone = (p) => String(p || "").replace(/[^+\d]/g, "");

async function openWhatsAppMessage(text, phone = ADMIN_WA_NUMBER) {
  const e164 = cleanPhone(phone);
  const enc = encodeURIComponent(text);
  const deep = `whatsapp://send?phone=${e164}&text=${enc}`;
  const web = `https://wa.me/${e164}?text=${enc}`;
  try {
    const can = await Linking.canOpenURL(deep);
    await Linking.openURL(can ? deep : web);
  } catch {
    await Linking.openURL(web);
  }
}

// Normalize different server shapes → one UI shape
function normalizeRow(raw) {
  const id =
    raw.id || raw._id || raw.txnId || raw.requestId || raw.reference || raw.ref || "";

  let kind =
    (raw.kind || raw.type || raw.mode || raw.action || raw.direction || "").toString().toUpperCase();
  if (["CREDIT", "DEPOSIT", "ADD", "TOPUP", "RECHARGE"].includes(kind)) kind = "ADD";
  if (["DEBIT", "WITHDRAW", "WITHDRAWAL", "PAYOUT"].includes(kind)) kind = "WITHDRAW";
  if (!["ADD", "WITHDRAW"].includes(kind)) {
    const sign = (raw.sign || "").toString();
    if (sign === "+" || raw.credit === true || raw.direction === "credit") kind = "ADD";
    else if (sign === "-" || raw.debit === true || raw.direction === "debit") kind = "WITHDRAW";
  }
  if (!["ADD", "WITHDRAW"].includes(kind)) kind = "ADD";

  let amount = Number(
    raw.amount ?? raw.amt ?? raw.value ?? raw.total ?? raw.money ?? (raw.delta ? Math.abs(raw.delta) : 0)
  ) || 0;

  const method =
    raw.method || raw.channel || raw.via || raw.gateway || (raw.upi ? "UPI" : "") || "—";

  let status = (raw.status || raw.state || raw.approval || "").toString().toUpperCase();
  if (!status) status = "PENDING";
  if (["SUCCESS", "APPROVE", "APPROVED", "PAID", "DONE"].includes(status)) status = "APPROVED";
  if (["FAIL", "FAILED", "REJECT", "REJECTED", "CANCELLED", "CANCELED"].includes(status)) status = "REJECTED";
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) status = "PENDING";

  const createdAt = raw.createdAt || raw.created_at || raw.time || raw.date || null;
  const updatedAt = raw.updatedAt || raw.updated_at || raw.modifiedAt || createdAt || null;

  const adminNote = raw.note || raw.remark || raw.adminNote || raw.reason || "";
  const ref = raw.ref || raw.reference || raw.utr || raw.txnRef || raw.paymentId || "";

  return { id: String(id), kind, amount, method: String(method), status, createdAt, updatedAt, adminNote, ref };
}

export default function TxnStatusScreen() {
  const navigation = useNavigation();

  const [typeFilter, setTypeFilter] = useState("ALL");     // ALL | ADD | WITHDRAW
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | APPROVED | REJECTED
  const [rows, setRows] = useState([]);                    // normalized rows
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const fetchRows = useCallback(async () => {
    setErr("");
    try {
      setLoading(true);
      let list = null;

      try {
        const r = await API.paymentRequests?.();
        list = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : null);
      } catch {}

      if (!list) {
        try {
          const r2 = await API.walletRequests?.();
          list = Array.isArray(r2?.data) ? r2.data : (Array.isArray(r2) ? r2 : null);
        } catch {}
      }

      if (!list) {
        try {
          const r3 = await API.transactions?.();
          list = Array.isArray(r3?.data) ? r3.data : (Array.isArray(r3) ? r3 : null);
        } catch {}
      }

      if (!list) {
        try {
          const r4 = await API.payments?.();
          list = Array.isArray(r4?.data) ? r4.data : (Array.isArray(r4) ? r4 : null);
        } catch {}
      }

      if (!list) {
        setRows([]);
        return;
      }

      const normalized = list.map(normalizeRow).sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tb - ta;
      });
      setRows(normalized);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useAutoRefresh(fetchRows, { intervalMs: 15000 });

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchRows();
    } finally {
      setRefreshing(false);
    }
  }, [fetchRows]);

  const list = useMemo(() => {
    return rows.filter((t) =>
      (typeFilter === "ALL" || t.kind === typeFilter) &&
      (statusFilter === "ALL" || t.status === statusFilter)
    );
  }, [rows, typeFilter, statusFilter]);

  const openSupport = useCallback((t) => {
    const msg =
      `Hi Admin,\nPlease check my request.\n` +
      `Type: ${t.kind}\nAmount: ₹${t.amount}\nTxn ID: ${t.id}\nStatus: ${t.status}`;
    openWhatsAppMessage(msg).catch(() =>
      Alert.alert("WhatsApp", "Unable to open WhatsApp right now.")
    );
  }, []);

  const renderRow = ({ item: t }) => {
    const color =
      t.status === "APPROVED" ? COLORS.green :
      t.status === "REJECTED" ? COLORS.red : COLORS.amber;

    return (
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowTop}>
            <View style={styles.kindWrap}>
              <Ionicons
                name={t.kind === "ADD" ? "add-circle-outline" : "cash-outline"}
                size={16}
                color="#fff"
              />
              <Text style={styles.kindTxt} numberOfLines={1}>
                {t.kind === "ADD" ? "Add Money" : "Withdraw"}
              </Text>
            </View>

            <View style={[styles.statChip, { backgroundColor: color }]}>
              <Text style={styles.statTxt} numberOfLines={1}>{t.status}</Text>
            </View>
          </View>

          <Text style={styles.amount} numberOfLines={1}>
            ₹{Number(t.amount || 0).toFixed(2)}
          </Text>

          <Text style={styles.meta} numberOfLines={1}>Method: {t.method}</Text>
          {!!t.createdAt && <Text style={styles.meta} numberOfLines={1}>Requested: {fmt(t.createdAt)}</Text>}
          {!!t.updatedAt && <Text style={styles.meta} numberOfLines={1}>Updated: {fmt(t.updatedAt)}</Text>}
          {!!t.ref && <Text style={styles.meta} numberOfLines={1}>Ref: {t.ref}</Text>}
          {!!t.adminNote && (
            <Text style={[styles.meta, { color: COLORS.red }]} numberOfLines={2}>
              Note: {t.adminNote}
            </Text>
          )}
        </View>

        {t.status === "PENDING" ? (
          <TouchableOpacity
            style={styles.supportBtn}
            activeOpacity={0.9}
            onPress={() => openSupport(t)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
            <Text style={styles.supportTxt} numberOfLines={1}>Contact</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate?.("MainTabs", { screen: "Wallet" });
  };

  // ✅ Keep header/logo/filters centered and responsive
  const HeaderBlock = (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Add / Withdraw Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <Image source={LOGO} style={styles.logo} resizeMode="contain" />

      {/* Filters (wrap enabled) */}
      <View style={styles.filtersWrap}>
        <View style={styles.filtersRow}>
          <Chip label="All" onPress={() => setTypeFilter("ALL")} active={typeFilter === "ALL"} />
          <Chip label="Add" onPress={() => setTypeFilter("ADD")} active={typeFilter === "ADD"} tone="green" />
          <Chip label="Withdraw" onPress={() => setTypeFilter("WITHDRAW")} active={typeFilter === "WITHDRAW"} />
        </View>

        <View style={[styles.filtersRow, { marginTop: 6 }]}>
          <Chip label="All" onPress={() => setStatusFilter("ALL")} active={statusFilter === "ALL"} />
          <Chip label="Pending" onPress={() => setStatusFilter("PENDING")} active={statusFilter === "PENDING"} tone="amber" />
          <Chip label="Approved" onPress={() => setStatusFilter("APPROVED")} active={statusFilter === "APPROVED"} tone="green" />
          <Chip label="Rejected" onPress={() => setStatusFilter("REJECTED")} active={statusFilter === "REJECTED"} tone="red" />
        </View>
      </View>

      <View style={{ height: 10 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ✅ Make list scroll include header so small screens never cut content */}
      <View style={styles.wrap}>
        {loading ? (
          <View style={{ paddingTop: 10 }}>
            {HeaderBlock}
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator />
            </View>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(i, idx) => i.id || String(idx)}
            renderItem={renderRow}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListHeaderComponent={
              <>
                {HeaderBlock}
                <View style={[styles.card, styles.cardCentered]}>
                  {list.length === 0 ? (
                    <View style={styles.empty}>
                      <Ionicons name="document-text-outline" size={22} color={COLORS.sub} />
                      <Text style={styles.emptyTxt}>No requests found.</Text>
                      {!!err && <Text style={[styles.emptyTxt, { color: COLORS.red, marginTop: 6 }]}>{err}</Text>}
                    </View>
                  ) : null}
                </View>

                {/* If list has data, we want spacing and not double card */}
                {list.length ? <View style={{ height: 10 }} /> : null}
              </>
            }
            // ✅ if list has items, render them inside centered width
            contentContainerStyle={[
              styles.listContent,
              list.length === 0 && { paddingBottom: 24 },
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { flex: 1, backgroundColor: COLORS.bg },

  // ✅ centered max width (tablet/web)
  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 4,
    backgroundColor: COLORS.bg,
  },
  backBtn: { padding: 6, marginRight: 6 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: COLORS.txt },

  logo: { width: 72, height: 72, alignSelf: "center", marginVertical: 8 },

  filtersWrap: { width: "100%" },
  // ✅ wrap chips for small phones
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  chipTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },

  // ✅ centered list area + spacing
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 12,
    alignItems: "center",
  },

  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: "0 10px 22px rgba(0,0,0,0.08)" },
      default: {
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  cardCentered: {
    maxWidth: 560,
    alignSelf: "center",
    padding: 12,
  },

  row: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  kindWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0b2545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    maxWidth: "70%",
  },
  kindTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },

  statChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },

  amount: { marginTop: 6, fontSize: 18, fontWeight: "900", color: COLORS.txt },
  meta: { marginTop: 3, fontSize: 12, color: COLORS.sub },

  supportBtn: {
    backgroundColor: "#6C2BD9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  supportTxt: { color: "#fff", fontWeight: "800" },

  empty: { alignItems: "center", paddingVertical: 22, gap: 8 },
  emptyTxt: { color: COLORS.sub, fontWeight: "600" },

  sep: { height: 10 },
});
