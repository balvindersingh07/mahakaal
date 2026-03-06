// src/screens/DashboardScreen.js
import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { API, getUser, clearSession } from "../api";
import { THEME } from "../theme";

export default function DashboardScreen() {
  const nav = useNavigation();
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const kickToLogin = useCallback(
    async (msg = "Admin only.") => {
      try {
        await clearSession();
      } catch {}
      Alert.alert("Access denied", msg);
      nav.reset({ index: 0, routes: [{ name: "Login" }] });
    },
    [nav]
  );

  const normalizeRole = (role) => String(role || "").toLowerCase().trim();

  // ✅ load current user (prefer server /me, fallback cached)
  const loadMe = useCallback(async () => {
    setLoadingMe(true);
    try {
      const r = await API.me?.().catch(() => null);

      // ✅ supports: {success,user} OR direct user OR {data:user}
      const serverUser = r?.data?.user ?? r?.data ?? r?.user ?? null;
      const cachedUser = await getUser?.().catch(() => null);

      const user = serverUser || cachedUser;

      if (!user) return kickToLogin("Please login again.");

      const role = normalizeRole(user.role);
      if (role !== "admin") return kickToLogin("Admin only.");

      setMe({ ...user, role: role }); // ✅ ensure role normalized
    } catch {
      return kickToLogin("Session expired. Please login again.");
    } finally {
      setLoadingMe(false);
    }
  }, [kickToLogin]);

  const isAdmin = useMemo(() => normalizeRole(me?.role) === "admin", [me]);

  // ✅ load users list (admin)
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;

    setErr("");
    setLoadingUsers(true);

    try {
      // supports /api/admin/users OR /admin/users (your helper handles)
      const r = await API.admin?.users?.();
      const d = r?.data ?? r;

      const list = Array.isArray(d?.users) ? d.users : Array.isArray(d) ? d : [];

      const mapped = list.map((u, i) => ({
        id: String(u._id ?? u.id ?? i + 1),
        name: u.name ?? u.username ?? `User ${i + 1}`,
        email: u.email ?? "-",
        phone: String(u.phone ?? u.mobile ?? ""),
        role: normalizeRole(u.role ?? (u.isAdmin ? "admin" : "user")) || "user",
      }));

      setRows(mapped);
    } catch (e) {
      const status = e?.response?.status;

      if (status === 401) return kickToLogin("Login required.");
      if (status === 403) {
        setErr("Access denied (admin only)");
        setRows([]);
        return;
      }

      setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to load users");
      setRows([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, kickToLogin]);

  // on mount -> verify admin
  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // refresh list whenever screen focused (only after admin verified)
  useFocusEffect(
    useCallback(() => {
      if (isAdmin) loadUsers();
    }, [isAdmin, loadUsers])
  );

  const logout = async () => {
    try {
      await clearSession();
    } catch {}
    nav.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  if (loadingMe) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#6b7280" }}>Checking access…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fb", padding: 16 }}>
      <View style={s.nav}>
        <Text style={s.brand}>
          Mahakaal{" "}
          <Text style={s.badge}>
            {me?.name || me?.phone || "-"} · {me?.role || "-"}
          </Text>
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          {isAdmin && (
            <TouchableOpacity onPress={() => nav.navigate("Users")}>
              <Text style={s.link}>Admin Users</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.btn} onPress={logout}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.h1}>Dashboard</Text>
        <Text>
          Welcome {me?.name || me?.phone}! (role:{" "}
          <Text style={{ fontWeight: "700" }}>{me?.role || "-"}</Text>)
        </Text>

        {isAdmin ? (
          <>
            <Text style={s.h2}>Admin Section (quick list)</Text>
            {!!err && <Text style={{ color: "#e11", marginBottom: 6 }}>{err}</Text>}

            {loadingUsers ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(it) => String(it.id)}
                ListHeaderComponent={() => (
                  <View
                    style={[
                      s.row,
                      { borderBottomWidth: 1, borderColor: "#e5e7eb", paddingBottom: 6, marginBottom: 6 },
                    ]}
                  >
                    <Text style={[s.cell, { flex: 1, fontWeight: "700" }]}>ID</Text>
                    <Text style={[s.cell, { flex: 3, fontWeight: "700" }]}>Name</Text>
                    <Text style={[s.cell, { flex: 4, fontWeight: "700" }]}>Email</Text>
                    <Text style={[s.cell, { flex: 2, fontWeight: "700" }]}>Role</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <View style={s.row}>
                    <Text style={[s.cell, { flex: 1 }]}>{item.id}</Text>
                    <Text style={[s.cell, { flex: 3 }]}>{item.name}</Text>
                    <Text style={[s.cell, { flex: 4 }]}>{item.email}</Text>
                    <Text style={[s.cell, { flex: 2 }]}>{item.role}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ padding: 8, color: "#6b7280" }}>No users</Text>}
              />
            )}
          </>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  brand: { fontSize: 18, fontWeight: "700" },
  badge: { backgroundColor: "#e2e8f0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontSize: 12 },
  link: { color: "#4f46e5", fontWeight: "600", paddingTop: 8 },
  btn: { backgroundColor: THEME.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, elevation: 4 },
  h1: { fontSize: 26, fontWeight: "800", marginBottom: 8 },
  h2: { marginTop: 16, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 6 },
  cell: { paddingRight: 8 },
});
