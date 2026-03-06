// app/users.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "../lib/useAutoRefresh";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { api } from "../lib/api";

type User = {
  idText: string;
  sid: string | number | null;
  uid: string;
  username: string;
  phone: string;
  balance: number;
  status: "Active" | "Blocked";
  referredByPhone?: string;
  referredByCode?: string;
  createdAt?: string;
};

type CombinedStats = {
  usersTotal: number;
  usersNew: number;
  betsTotal: number;
  betsRecent: number;
  txRecent: number;
};

const BREAK_TABLE = 900;

export default function UsersScreen() {
  const { width } = useWindowDimensions();
  const useCardLayout = width < BREAK_TABLE;

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<User[]>([]);
  const [pwDraft, setPwDraft] = useState<Record<string, string>>({});
  const [balDraft, setBalDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<CombinedStats | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res: any = await api.users();
      const arr: any[] = Array.isArray(res) ? res : res?.users ?? res?.data ?? [];

      const mapped: User[] = arr.map((u: any, i: number) => {
        const sid = (u._id ?? u.id ?? u.userId ?? null) as any;
        const uid = String(u._id ?? u.phone ?? sid ?? `row-${i}`);

        const rawStatus = String(u.status ?? "").toLowerCase();
        const status: User["status"] = rawStatus === "blocked" ? "Blocked" : "Active";

        const ref = u.referredBy;
        const referredByPhone = ref?.phone ?? ref?.mobile ?? "";
        const referredByCode = ref?.referralCode ?? "";

        return {
          idText: String(i + 1),
          sid,
          uid,
          username: u.username ?? u.name ?? "-",
          phone: String(u.phone ?? u.mobile ?? "-"),
          balance: Number(u.wallet ?? u.balance ?? 0),
          status,
          referredByPhone,
          referredByCode,
          createdAt: u.createdAt,
        };
      });

      setRows(mapped);
    } catch (e: any) {
      Alert.alert("Users", e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);
  useAutoRefresh(loadUsers, { intervalMs: 15000 });

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.combinedShow();
        const s: CombinedStats | null = res?.stats || res?.combined || null;
        if (s) setStats(s);
      } catch {
        setStats(null);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    const qLower = q.toLowerCase();
    return rows.filter(
      (r) => r.phone.includes(q) || r.username.toLowerCase().includes(qLower)
    );
  }, [rows, query]);

  const onReset = () => setQuery("");

  const onUpdate = async (u: User) => {
    const key = u.uid;
    const newPw = (pwDraft[key] ?? "").trim();
    const balStr = (balDraft[key] ?? "").trim();

    if (!newPw && !balStr) {
      Alert.alert("Update", "Nothing to update.");
      return;
    }

    try {
      setLoading(true);

      if (newPw) {
        try {
          await api.userSetPassword({ userId: u.sid, phone: u.phone, password: newPw });
        } catch (err: any) {
          Alert.alert("Password", err?.message || "Password change API missing on backend.");
        }
      }

      if (balStr) {
        const desired = Number(balStr);
        if (!Number.isFinite(desired) || desired < 0) throw new Error("Enter valid non-negative Balance (₹).");

        if (desired !== u.balance) {
          const diff = desired - u.balance;
          if (diff > 0) await api.walletAdd(u.phone, diff, "Admin adjust ↑");
          if (diff < 0) await api.walletWithdraw(u.phone, Math.abs(diff), "Admin adjust ↓");
        }
      }

      await loadUsers();
      setPwDraft((p) => ({ ...p, [key]: "" }));
      setBalDraft((p) => ({ ...p, [key]: "" }));
      Alert.alert("Success", "Updated.");
    } catch (e: any) {
      Alert.alert("Update", e?.message || "Failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE (WEB confirm + logs)
  const doDelete = async (u: User) => {
    console.log("[UI] doDelete()", { uid: u.uid, sid: u.sid, phone: u.phone });

    const backup = rows;
    setRows((prev) => prev.filter((x) => x.uid !== u.uid)); // instant remove

    try {
      setLoading(true);

      // IMPORTANT: path must start with "/"
      const resp = await api.post("/api/admin/users/delete", {
        id: u.sid,
        userId: u.sid,
        phone: u.phone,
      });

      console.log("[UI] delete OK:", resp);

      // clear drafts
      setPwDraft((p) => {
        const n = { ...p };
        delete n[u.uid];
        return n;
      });
      setBalDraft((p) => {
        const n = { ...p };
        delete n[u.uid];
        return n;
      });

      await loadUsers();
      Alert.alert("Deleted", "User removed.");
    } catch (e: any) {
      console.log("[UI] delete FAIL:", e);
      setRows(backup); // restore
      Alert.alert("Delete", e?.message || "Failed.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = (u: User) => {
    console.log("[UI] Delete pressed", u.uid);

    if (Platform.OS === "web") {
      // ✅ web confirm (Alert.alert often buggy on web)
      const ok = window.confirm(`Delete user?\n${u.username} (${u.phone})`);
      if (ok) doDelete(u);
      return;
    }

    Alert.alert("Delete user?", `${u.username} (${u.phone})`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => doDelete(u) },
    ]);
  };

  const onBlock = async (u: User) => {
    const makeBlocked = u.status === "Active";
    try {
      setLoading(true);
      await api.userBlock(u.sid ?? u.phone, makeBlocked);
      await loadUsers();
      Alert.alert(makeBlocked ? "Blocked" : "Unblocked", `${u.phone}`);
    } catch (e: any) {
      Alert.alert("Block/Unblock", e?.message || "Failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderUserCard = (u: User) => (
    <View key={u.uid} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>#{u.idText} {u.username}</Text>
        <View style={[styles.badge, u.status === "Active" ? styles.badgeGreen : styles.badgeRed]}>
          <Text style={{ color: u.status === "Active" ? "#065f46" : "#7f1d1d", fontWeight: "700", fontSize: 12 }}>
            {u.status}
          </Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Phone</Text>
        <Text style={styles.cardValue}>{u.phone}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Balance</Text>
        <TextInput
          placeholder={String(u.balance)}
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={balDraft[u.uid] ?? ""}
          onChangeText={(t) => setBalDraft((prev) => ({ ...prev, [u.uid]: t }))}
          style={[styles.input, { flex: 1 }]}
        />
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>New Password</Text>
        <TextInput
          placeholder="Leave blank to keep same"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={pwDraft[u.uid] ?? ""}
          onChangeText={(t) => setPwDraft((prev) => ({ ...prev, [u.uid]: t }))}
          style={[styles.input, { flex: 1 }]}
        />
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Created</Text>
        <Text style={styles.cardValue}>{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</Text>
      </View>
      {u.referredByPhone && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Referred by</Text>
          <Text style={styles.cardValue}>{u.referredByPhone}{u.referredByCode ? ` (${u.referredByCode})` : ""}</Text>
        </View>
      )}
      <View style={styles.cardActions}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => onUpdate(u)} style={[styles.btnSm, styles.success]}>
          <Text style={styles.btnSmText}>Update</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={() => onDelete(u)} style={[styles.btnSm, styles.danger]}>
          <Text style={styles.btnSmText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={() => onBlock(u)} style={[styles.btnSm, styles.warn]}>
          <Text style={styles.btnSmText}>{u.status === "Active" ? "Block" : "Unblock"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="always">
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#6C2BD9" }]}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{stats.usersTotal.toLocaleString("en-IN")}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#16a34a" }]}>
            <Text style={styles.statLabel}>New Users (Last 48h)</Text>
            <Text style={styles.statValue}>{stats.usersNew.toLocaleString("en-IN")}</Text>
          </View>
        </View>
      )}
      <View style={[styles.searchRow, useCardLayout && { flexWrap: "wrap" }]}>
        <TextInput
          placeholder="Search by phone/username..."
          placeholderTextColor="#9ca3af"
          style={[styles.searchInput, useCardLayout && { minWidth: 200, flex: 1 }]}
          value={query}
          onChangeText={setQuery}
        />
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setQuery((q) => q.trim())}>
          <Text style={styles.btnPrimaryText}>Search</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGray]} onPress={onReset}>
          <Text style={styles.btnGrayText}>Reset</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGray]} onPress={loadUsers}>
          <Text style={styles.btnGrayText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: "#6b7280", marginTop: 6, fontWeight: "600" }}>Loading…</Text>
        </View>
      ) : null}

      {useCardLayout ? (
        <View style={styles.cardGrid}>
          {filtered.map((u) => renderUserCard(u))}
        </View>
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={{ minWidth: Math.max(width - 48, 700) }}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.th, { flex: 1.8 }]}>Username</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>Phone</Text>
            <Text style={[styles.th, { flex: 1.8 }]}>Created At</Text>
            <Text style={[styles.th, { flex: 1.6 }]}>Referred By</Text>
            <Text style={[styles.th, { flex: 2 }]}>New Password</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Balance</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
            <Text style={[styles.th, { flex: 2 }]}>Actions</Text>
          </View>

          {filtered.map((u, i) => {
            const zebra = i % 2 === 0;
            return (
              <View key={u.uid} style={[styles.row, zebra && styles.zebraRow]}>
                <Text style={[styles.td, { flex: 0.5 }]}>{u.idText}</Text>

                <View style={[styles.cell, { flex: 1.8 }]}>
                  <TextInput value={u.username} editable={false} style={[styles.input, styles.inputReadonly]} />
                </View>

                <View style={[styles.cell, { flex: 1.4 }]}>
                  <TextInput value={u.phone} editable={false} style={[styles.input, styles.inputReadonly]} keyboardType="number-pad" />
                </View>

                <View style={[styles.cell, { flex: 1.8 }]}>
                  <Text style={{ fontSize: 12, color: "#374151" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                  </Text>
                </View>

                <View style={[styles.cell, { flex: 1.6 }]}>
                  <Text style={{ fontSize: 12, color: "#374151" }}>
                    {u.referredByPhone ? `${u.referredByPhone}${u.referredByCode ? ` (${u.referredByCode})` : ""}` : "-"}
                  </Text>
                </View>

                <View style={[styles.cell, { flex: 2 }]}>
                  <TextInput
                    placeholder="Leave blank to keep same"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={pwDraft[u.uid] ?? ""}
                    onChangeText={(t) => setPwDraft((prev) => ({ ...prev, [u.uid]: t }))}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.cell, { flex: 1.2 }]}>
                  <TextInput
                    placeholder={String(u.balance)}
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={balDraft[u.uid] ?? ""}
                    onChangeText={(t) => setBalDraft((prev) => ({ ...prev, [u.uid]: t }))}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.cell, { flex: 1 }]}>
                  <View style={[styles.badge, u.status === "Active" ? styles.badgeGreen : styles.badgeRed]}>
                    <Text style={{ color: u.status === "Active" ? "#065f46" : "#7f1d1d", fontWeight: "700" }}>
                      {u.status}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cell, { flex: 2, flexDirection: "row", gap: 8 }]}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => onUpdate(u)} style={[styles.btnSm, styles.success]}>
                    <Text style={styles.btnSmText}>Update</Text>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.8} onPress={() => onDelete(u)} style={[styles.btnSm, styles.danger]}>
                    <Text style={styles.btnSmText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.8} onPress={() => onBlock(u)} style={[styles.btnSm, styles.warn]}>
                    <Text style={styles.btnSmText}>{u.status === "Active" ? "Block" : "Unblock"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f5ff", padding: 16, gap: 12 },
  cardGrid: { gap: 12, paddingVertical: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  cardLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600", minWidth: 90 },
  cardValue: { fontSize: 14, color: "#111827", flex: 1 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  statCard: {
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 4,
    gap: 4,
  },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#111827" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  searchInput: {
    height: 40, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: "#6C2BD9", minWidth: 300,
  },
  btn: { height: 40, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: "#6C2BD9" },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  btnGray: { backgroundColor: "#EC4899" },
  btnGrayText: { color: "#fff", fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", minHeight: 62, borderBottomWidth: 1, borderBottomColor: "#DCF8C6" },
  headerRow: { backgroundColor: "#6C2BD9", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  th: { color: "#FFFFFF", fontWeight: "800", paddingVertical: 14, paddingHorizontal: 10 },
  zebraRow: { backgroundColor: "#f0fdf4" },
  td: { paddingHorizontal: 10, color: "#111827" },
  cell: { paddingHorizontal: 10, width: "100%" },
  input: { backgroundColor: "#fff", height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#6C2BD9", paddingHorizontal: 10 },
  inputReadonly: { color: "#111827" },
  badge: { alignSelf: "flex-start", borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  badgeGreen: { backgroundColor: "#d1fae5", borderColor: "#6C2BD9", borderWidth: 1 },
  badgeRed: { backgroundColor: "#fee2e2", borderColor: "#ef4444", borderWidth: 1 },

  btnSm: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, minWidth: 72, alignItems: "center", justifyContent: "center" },
  btnSmText: { color: "#fff", fontWeight: "700" },
  success: { backgroundColor: "#6C2BD9" },
  danger: { backgroundColor: "#ef4444" },
  warn: { backgroundColor: "#EC4899" },
});
