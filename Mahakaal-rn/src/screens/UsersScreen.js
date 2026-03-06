// src/screens/UsersScreen.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api, { API, getUser, clearSession } from "../api";
import { THEME } from "../theme";

export default function UsersScreen() {
  const nav = useNavigation();

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const kickToLogin = useCallback(async (msg = "Admin only.") => {
    try {
      await clearSession?.();
    } catch {}
    Alert.alert("Access denied", msg);
    nav.reset({ index: 0, routes: [{ name: "Login" }] });
  }, [nav]);

  const ensureAdmin = useCallback(async () => {
    try {
      // Prefer cached user first (fast), then verify via /me if needed
      let me = await getUser?.();

      // If no cached role, try /api/me
      if (!me?.role) {
        try {
          const r = await API.me?.();
          me = r?.data?.user ?? r?.data ?? me;
        } catch {}
      }

      if (!me || me.role !== "admin") {
        // if user is logged in but not admin, send back to Dashboard (as you had)
        if (me) {
          nav.replace?.("Dashboard") || nav.navigate("Dashboard");
          return false;
        }
        await kickToLogin("Please login with admin account.");
        return false;
      }
      return true;
    } catch {
      await kickToLogin("Please login again.");
      return false;
    }
  }, [kickToLogin, nav]);

  const load = useCallback(async () => {
    const ok = await ensureAdmin();
    if (!ok) return;

    try {
      setLoading(true);
      setErr("");

      // ✅ Use smart helper; supports /api/admin/users & /admin/users
      const r = await API.admin.users();
      const data = r?.data ?? r;

      // backend sometimes sends { count, users: [...] } — normalize here
      const list = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data)
        ? data
        : [];

      const mapped = list.map((u, i) => ({
        // ✅ IMPORTANT: keep real _id if exists (for wallet actions)
        id: String(u._id ?? u.id ?? i + 1),
        name: u.name ?? u.username ?? `User ${i + 1}`,
        phone: String(u.phone ?? u.mobile ?? ""),
        wallet: Number(u.wallet ?? u.balance ?? 0),
        status: u.status ?? "Active",
        role: u.role ?? (u.isAdmin ? "admin" : "user"),
      }));

      setRows(mapped);
    } catch (e) {
      const status = e?.response?.status;

      if (status === 401) return kickToLogin("Session expired. Login again.");
      if (status === 403) {
        setErr("Access denied (admin only)");
        // send back dashboard if logged in but not allowed
        nav.replace?.("Dashboard") || nav.navigate("Dashboard");
        return;
      }

      setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [ensureAdmin, kickToLogin, nav]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const askAmount = async (label) => {
    if (Platform.OS === "web") {
      const x = prompt(`${label} amount (₹):`, "500");
      const n = Number(x);
      return x && n > 0 ? n : null;
    }
    return new Promise((resolve) => {
      Alert.alert(
        label,
        "Choose amount",
        [
          { text: "₹500", onPress: () => resolve(500) },
          { text: "₹1000", onPress: () => resolve(1000) },
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        ],
        { cancelable: true }
      );
    });
  };

  const topUp = async (userId) => {
    const amount = await askAmount("Add Balance");
    if (!amount) return;

    try {
      await api.post("/api/admin/wallet/add", { userId, amount, note: "Admin top-up" })
        .catch(() => api.post("/admin/wallet/add", { userId, amount, note: "Admin top-up" }));

      Alert.alert("Success", `Added ₹${amount}`);
      load();
    } catch (e) {
      Alert.alert("Top-up", e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed");
    }
  };

  const withdraw = async (userId) => {
    const amount = await askAmount("Withdraw Balance");
    if (!amount) return;

    try {
      await api.post("/api/admin/wallet/withdraw", { userId, amount, note: "Admin withdraw" })
        .catch(() => api.post("/admin/wallet/withdraw", { userId, amount, note: "Admin withdraw" }));

      Alert.alert("Success", `Withdrawn ₹${amount}`);
      load();
    } catch (e) {
      Alert.alert("Withdraw", e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed");
    }
  };

  const renderRow = ({ item }) => (
    <View style={s.row}>
      <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>
        {String(item.id).slice(0, 8)}
      </Text>
      <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>
        {item.phone}
      </Text>
      <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>
        ₹{Number(item.wallet || 0).toFixed(2)}
      </Text>
      <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>
        {item.role}
      </Text>

      <View style={[s.cell, s.actions]}>
        <TouchableOpacity style={[s.btn, s.btnAdd]} onPress={() => topUp(item.id)} activeOpacity={0.9}>
          <Text style={s.btnTxt}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnWithdraw]} onPress={() => withdraw(item.id)} activeOpacity={0.9}>
          <Text style={s.btnTxt}>Withdraw</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fb", padding: 16 }}>
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.h1}>Users (admin-only)</Text>

          <TouchableOpacity style={[s.btn, s.btnRefresh]} onPress={load} disabled={loading} activeOpacity={0.9}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnTxt}>Refresh</Text>}
          </TouchableOpacity>
        </View>

        {!!err && <Text style={{ color: "#e11", marginBottom: 8 }}>{err}</Text>}

        <View style={[s.row, s.headRow]}>
          <Text style={[s.head, { flex: 1 }]}>ID</Text>
          <Text style={[s.head, { flex: 2 }]}>Name</Text>
          <Text style={[s.head, { flex: 2 }]}>Phone</Text>
          <Text style={[s.head, { flex: 1 }]}>Wallet</Text>
          <Text style={[s.head, { flex: 1 }]}>Role</Text>
          <Text style={[s.head, { width: 160 }]}>Actions</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRow}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            !loading ? <Text style={{ padding: 10, color: "#6b7280" }}>No users</Text> : null
          }
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, elevation: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  h1: { fontSize: 20, fontWeight: "800" },

  headRow: {
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingBottom: 6,
    marginBottom: 6,
  },

  row: { flexDirection: "row", paddingVertical: 6, alignItems: "center" },
  head: { fontWeight: "700", color: "#111827" },
  cell: { paddingRight: 8, color: "#111827" },

  actions: { flexDirection: "row", width: 160, justifyContent: "flex-start" },

  btn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginRight: 8, alignItems: "center" },
  btnAdd: { backgroundColor: THEME.primary },
  btnWithdraw: { backgroundColor: "#dc2626" },
  btnRefresh: { backgroundColor: THEME.primary, marginRight: 0 },

  btnTxt: { color: "#fff", fontWeight: "800" },
});
