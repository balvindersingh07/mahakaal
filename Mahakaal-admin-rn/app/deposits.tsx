// app/deposits.tsx - Admin UPI Deposit Requests
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { BASE } from "../lib/api";

type Deposit = {
  _id: string;
  user: { username?: string; phone?: string; wallet?: number };
  amount: number;
  screenshotUrl: string;
  status: "pending" | "approved" | "rejected";
  transactionNote?: string;
  createdAt: string;
};

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const fullUrl = (path: string) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `${BASE.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function DepositsScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 900);

  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState<string>("pending");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api.deposits(filter ? { status: filter } : undefined);
      const list = res?.deposits || res?.items || res || [];
      setDeposits(Array.isArray(list) ? list : []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load deposits");
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onApprove = async (d: Deposit) => {
    Alert.alert(
      "Approve Deposit",
      `Credit ₹${d.amount} to ${d.user?.username || "User"} (${d.user?.phone || ""})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await api.approveDeposit(d._id);
              Alert.alert("Done", "Deposit approved. Wallet credited.");
              load();
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to approve");
            }
          },
        },
      ]
    );
  };

  const onReject = async (d: Deposit) => {
    Alert.alert("Reject Deposit", `Reject this deposit request?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await api.rejectDeposit(d._id);
            Alert.alert("Done", "Deposit rejected.");
            load();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to reject");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={[s.wrap, { maxWidth: maxW }]}>
      <Text style={s.title}>UPI Deposit Requests</Text>
      <Text style={s.sub}>Review and approve/reject user deposit requests. Approve credits user wallet.</Text>

      <View style={s.filters}>
        {["pending", "approved", "rejected"].map((f) => (
          <Pressable
            key={f}
            style={[s.filterBtn, filter === f && s.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={s.refreshBtn} onPress={load} disabled={loading}>
        <Ionicons name="refresh" size={16} color="#fff" />
        <Text style={s.refreshText}>Refresh</Text>
      </Pressable>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#6C2BD9" />
        </View>
      ) : deposits.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No {filter} deposits</Text>
        </View>
      ) : (
        <View style={s.list}>
          {deposits.map((d) => (
            <View key={d._id} style={s.card}>
              <View style={s.cardLeft}>
                <Text style={s.userName}>
                  {(d.user as any)?.username || "User"} ({(d.user as any)?.phone || "—"})
                </Text>
                <Text style={s.amount}>{inr(d.amount)}</Text>
                {d.transactionNote ? (
                  <Text style={s.note} numberOfLines={2}>
                    Note: {d.transactionNote}
                  </Text>
                ) : null}
                <Text style={s.date}>{fmt(d.createdAt)}</Text>
                <View style={[s.status, s[`status_${d.status}` as keyof typeof s] as object]}>
                  <Text style={s.statusText}>{d.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.cardRight}>
                {d.screenshotUrl ? (
                  <Image
                    source={{ uri: fullUrl(d.screenshotUrl) }}
                    style={s.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[s.thumb, s.thumbPlaceholder]}>
                    <Ionicons name="image-outline" size={32} color="#9ca3af" />
                  </View>
                )}

                {d.status === "pending" && (
                  <View style={s.actions}>
                    <Pressable style={[s.btn, s.btnGreen]} onPress={() => onApprove(d)}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={s.btnText}>Approve</Text>
                    </Pressable>
                    <Pressable style={[s.btn, s.btnRed]} onPress={() => onReject(d)}>
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={s.btnText}>Reject</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f5ff" },
  wrap: { padding: 16, alignSelf: "center", paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 16 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e5e7eb" },
  filterActive: { backgroundColor: "#6C2BD9" },
  filterText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  filterTextActive: { color: "#fff" },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#6b7280",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  refreshText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  loading: { paddingVertical: 40, alignItems: "center" },
  empty: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontWeight: "700", fontSize: 15 },
  list: { gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 16,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end", gap: 8 },
  userName: { fontSize: 16, fontWeight: "900", color: "#111827" },
  amount: { fontSize: 18, fontWeight: "800", color: "#6C2BD9", marginTop: 4 },
  note: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  date: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  status: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  status_pending: { backgroundColor: "#fef3c7" },
  status_approved: { backgroundColor: "#d1fae5" },
  status_rejected: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 11, fontWeight: "800", color: "#374151" },
  thumb: { width: 100, height: 100, borderRadius: 8, backgroundColor: "#f3f4f6" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 8 },
  btn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnGreen: { backgroundColor: "#22c55e" },
  btnRed: { backgroundColor: "#ef4444" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
