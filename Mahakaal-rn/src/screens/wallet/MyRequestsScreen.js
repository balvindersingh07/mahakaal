// My Payment Requests - user sees status of add/withdraw requests
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api";
import { THEME } from "../../theme";

const statusColor = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "approved" || v === "paid") return "#16a34a";
  if (v === "rejected") return "#dc2626";
  return "#f59e0b";
};

const statusLabel = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "paid") return "Paid";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return "Pending";
};

export default function MyRequestsScreen() {
  const nav = useNavigation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      const r = await api.get("/payment-requests/my");
      const data = r?.data ?? r;
      const arr = data?.requests ?? data?.items ?? data?.rows ?? (Array.isArray(data) ? data : []);
      setList(Array.isArray(arr) ? arr : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderItem = ({ item }) => {
    const type = String(item?.type || "add").toLowerCase();
    const status = String(item?.status || "pending").toLowerCase();
    const amt = Number(item?.amount || 0);
    const createdAt = item?.createdAt;

    return (
      <View style={s.row}>
        <View style={s.rowLeft}>
          <Text style={s.type}>{type === "withdraw" ? "Withdraw" : "Add"}</Text>
          <Text style={s.amount}>₹{amt.toLocaleString("en-IN")}</Text>
          {createdAt && (
            <Text style={s.date}>
              {new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
        <View style={[s.badge, { backgroundColor: statusColor(status) + "20", borderColor: statusColor(status) }]}>
          <Text style={[s.badgeTxt, { color: statusColor(status) }]}>{statusLabel(status)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <View style={{ width: 24, marginRight: 12 }} />
        <Text style={s.title}>My Payment Requests</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : list.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
          <Text style={s.empty}>No payment requests yet</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(it) => it._id || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  backBtn: { marginRight: 12 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { marginTop: 8, color: "#6b7280", fontWeight: "600" },
  list: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  rowLeft: {},
  type: { fontSize: 14, fontWeight: "700", color: "#374151" },
  amount: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 2 },
  date: { fontSize: 11, color: "#6b7280", marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  badgeTxt: { fontWeight: "800", fontSize: 12 },
});
