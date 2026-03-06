// app/payment-requests.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useAutoRefresh } from "../lib/useAutoRefresh";

type Req = {
  _id: string;
  userName: string;
  userPhone: string;
  amount: number;
  mode: string;
  note?: string;
  type: "add" | "withdraw";
  status: "pending" | "approved" | "rejected" | "paid";
  createdAt: string;
  adminTxnId?: string;
};

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function normStatus(s: any): Req["status"] {
  const v = String(s || "pending").toLowerCase().trim();
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  if (v === "paid") return "paid";
  return "pending";
}

function statusTitle(s: Req["status"]) {
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  if (s === "paid") return "Paid";
  return "Pending";
}

// ✅ map backend request to UI row (supports MANY shapes)
function mapReq(r: any): Req {
  const u = r?.user || r?.userId || r?.customer || {};

  const id = String(r?._id || r?.id || r?.requestId || "");
  const amount = Number(r?.amount || 0);

  const name =
    String(
      u?.username ||
        u?.name ||
        r?.userName ||
        r?.username ||
        r?.user ||
        "User"
    ) || "User";

  const phone =
    String(
      u?.phone ||
        u?.mobile ||
        r?.userPhone ||
        r?.phone ||
        r?.number ||
        ""
    ) || "";

  const mode = String(r?.mode || r?.app || r?.paymentMode || "whatsapp");

  const typeRaw = String(r?.type || r?.requestType || "add").toLowerCase();
  const type: Req["type"] = typeRaw === "withdraw" ? "withdraw" : "add";

  const status = normStatus(r?.status);
  const createdAt = r?.createdAt || r?.created_at || new Date().toISOString();

  return {
    _id: id,
    userName: name,
    userPhone: phone,
    amount,
    mode,
    note: r?.note || "",
    type,
    status,
    createdAt,
    adminTxnId: r?.adminTxnId || "",
  };
}

function openWhatsApp(phone: string, text?: string) {
  const p = String(phone || "").replace(/\D/g, "");
  if (!p) return;
  const enc = encodeURIComponent(text || "Hi");
  const url = `https://wa.me/91${p.slice(-10)}?text=${enc}`;
  Linking.openURL(url).catch(() => {});
}

const BREAK = 900;

export default function PaymentRequestsScreen() {
  const { width } = useWindowDimensions();
  const useCards = width < BREAK;

  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "markPaid">("approve");
  const [modalReq, setModalReq] = useState<Req | null>(null);
  const [txnId, setTxnId] = useState("");
  const [filter, setFilter] = useState<"all" | "add" | "withdraw" | "pending">("pending");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const params: Record<string, string> = {};
      if (filter === "pending") params.status = "pending";

      const data = await api.paymentRequests(params);

      // accept multiple shapes
      const list: any[] =
        data?.requests ||
        data?.items ||
        data?.rows ||
        data?.data ||
        (Array.isArray(data) ? data : []) ||
        [];

      let mapped = (list || [])
        .map(mapReq)
        .filter((x: Req) => Boolean(x._id)); // safety

      if (filter === "add") {
        mapped = mapped.filter((x) => x.type === "add");
      } else if (filter === "withdraw") {
        mapped = mapped.filter((x) => x.type === "withdraw");
      }

      setRows(mapped);
    } catch (e: any) {
      Alert.alert("Payment Requests", e?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, { intervalMs: 15000 });

  const setStatusLocal = (id: string, status: Req["status"]) =>
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));

  const openApproveModal = (r: Req) => {
    setModalReq(r);
    setModalAction("approve");
    setTxnId("");
    setModalOpen(true);
  };

  const openMarkPaidModal = (r: Req) => {
    setModalReq(r);
    setModalAction("markPaid");
    setTxnId("");
    setModalOpen(true);
  };

  const submitModal = async () => {
    if (!modalReq) return;
    const id = modalReq._id;
    try {
      setBusyId(id);
      if (modalAction === "approve") {
        await api.approvePayment(id, { adminNote: txnId ? `Txn: ${txnId}` : "", adminTxnId: txnId });
        setStatusLocal(id, "approved");
      } else {
        await api.markPaidPayment(id, { adminTxnId: txnId });
        setStatusLocal(id, "paid");
      }
      setModalOpen(false);
      setModalReq(null);
      setTxnId("");
      load();
    } catch (e: any) {
      Alert.alert(modalAction === "approve" ? "Approve" : "Mark Paid", e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: string) => {
    try {
      setBusyId(id);
      await api.rejectPayment(id);
      setStatusLocal(id, "rejected");
    } catch (e: any) {
      Alert.alert("Reject", e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f5ff", padding: 16 }}>
      {/* Modal: Approve / Mark Paid with Transaction ID */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#6C2BD9", marginBottom: 12 }}>
              {modalAction === "approve" ? "Approve & Add to Wallet" : "Mark Paid"}
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              {modalAction === "approve" && modalReq?.type === "add"
                ? "User paid via UPI/WhatsApp. Enter transaction ID (optional):"
                : "Enter UPI/transaction ID (optional):"}
            </Text>
            <TextInput
              value={txnId}
              onChangeText={setTxnId}
              placeholder="e.g. 123456789012"
              style={{ borderWidth: 1, borderColor: "#6C2BD9", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={[styles.btnSm, styles.gray, { flex: 1 }]} onPress={() => { setModalOpen(false); setModalReq(null); setTxnId(""); }}>
                <Text style={[styles.btnSmText, { color: "#111827" }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btnSm, styles.success, { flex: 1 }]} onPress={submitModal} disabled={!!busyId}>
                <Text style={styles.btnSmText}>{busyId ? "..." : modalAction === "approve" ? "Approve" : "Mark Paid"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* top right refresh */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <FilterChip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip label="Add Only" active={filter === "add"} onPress={() => setFilter("add")} />
          <FilterChip label="Withdraw Only" active={filter === "withdraw"} onPress={() => setFilter("withdraw")} />
          <FilterChip label="Pending" active={filter === "pending"} onPress={() => setFilter("pending")} />
        </View>
        <Pressable
          onPress={load}
          style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e5e7eb" }}
          disabled={loading}
        >
          <Ionicons name={loading ? "time" : "refresh"} size={18} color="#111827" />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10, fontWeight: "700" }}>Loading…</Text>
        </View>
      ) : useCards ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {rows.map((r) => {
            const title = statusTitle(r.status);
            const busy = busyId === r._id;
            return (
              <View key={r._id} style={cardStyles.card}>
                <View style={cardStyles.row}>
                  <Text style={cardStyles.label}>User</Text>
                  <Text style={cardStyles.value}>{r.userName}</Text>
                </View>
                <View style={cardStyles.row}>
                  <Text style={cardStyles.label}>Amount</Text>
                  <Text style={cardStyles.value}>{inr(r.amount)}</Text>
                </View>
                <View style={cardStyles.row}>
                  <Text style={cardStyles.label}>Phone</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={cardStyles.value}>{r.userPhone}</Text>
                    <Pressable onPress={() => openWhatsApp(r.userPhone)}>
                      <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    </Pressable>
                  </View>
                </View>
                <View style={cardStyles.row}>
                  <Text style={cardStyles.label}>Status</Text>
                  <View style={[styles.badge, badgeStyle(title)]}>
                    <Text style={[styles.badgeText, badgeTextStyle(title)]}>{title}</Text>
                  </View>
                </View>
                <View style={[cardStyles.actions, { flexDirection: "row", gap: 8, flexWrap: "wrap" }]}>
                  {r.status === "pending" && (
                    <>
                      <Pressable style={[styles.btnSm, styles.success, busy && { opacity: 0.7 }]} onPress={() => openApproveModal(r)} disabled={busy}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Text style={styles.btnSmText}>{busy ? "..." : "Approve"}</Text>
                      </Pressable>
                      <Pressable style={[styles.btnSm, styles.danger, busy && { opacity: 0.7 }]} onPress={() => onReject(r._id)} disabled={busy}>
                        <Ionicons name="close" size={14} color="#fff" />
                        <Text style={styles.btnSmText}>{busy ? "..." : "Reject"}</Text>
                      </Pressable>
                    </>
                  )}
                  {r.status === "approved" && (
                    <Pressable style={[styles.btnSm, styles.info, busy && { opacity: 0.7 }]} onPress={() => openMarkPaidModal(r)} disabled={busy}>
                      <Ionicons name="cash" size={14} color="#fff" />
                      <Text style={styles.btnSmText}>{busy ? "..." : "Mark Paid"}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          {rows.length === 0 && (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: "#ef4444", fontWeight: "700" }}>No requests found</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: Math.max(width - 48, 700), alignSelf: "flex-start" }}>
            {/* Header */}
            <View style={[styles.row, styles.head]}>
              <Text style={[styles.th, { flex: 1.8 }]}>User</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Amount</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Phone</Text>
              <Text style={[styles.th, { flex: 1 }]}>Status</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Txn ID</Text>
              <Text style={[styles.th, { flex: 1.6 }]}>Date</Text>
              <Text style={[styles.th, { flex: 2.2 }]}>Action</Text>
            </View>

            {/* Body */}
            {rows.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ color: "#ef4444", fontWeight: "700" }}>No requests found</Text>
              </View>
            ) : (
              rows.map((r, i) => {
                const zebra = i % 2 === 0;
                const title = statusTitle(r.status);
                const busy = busyId === r._id;

                return (
                  <View key={r._id} style={[styles.row, zebra && styles.zebra]}>
                    <Text style={[styles.td, { flex: 1.8 }]}>{r.userName}</Text>
                    <Text style={[styles.td, { flex: 1.2 }]}>{inr(r.amount)}</Text>
                    <View style={[styles.td, { flex: 1.4, flexDirection: "row", alignItems: "center", gap: 4 }]}>
                      <Text>{r.userPhone}</Text>
                      <Pressable onPress={() => openWhatsApp(r.userPhone, `Hi, regarding your ₹${r.amount} ${r.type} request`)} style={{ padding: 4 }}>
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                      </Pressable>
                    </View>

                    <View style={[styles.td, { flex: 1 }]}>
                      <View style={[styles.badge, badgeStyle(title)]}>
                        <Text style={[styles.badgeText, badgeTextStyle(title)]}>{title}</Text>
                      </View>
                    </View>

                    <Text style={[styles.td, { flex: 1.2, fontSize: 11 }]} numberOfLines={1}>{r.adminTxnId || "-"}</Text>

                    <Text style={[styles.td, { flex: 1.6 }]}>{fmt(r.createdAt)}</Text>

                    <View style={[styles.td, { flex: 2.2, flexDirection: "row", gap: 6, flexWrap: "wrap" }]}>
                      {r.status === "pending" && (
                        <>
                          <Pressable
                            style={[styles.btnSm, styles.success, busy && { opacity: 0.7 }]}
                            onPress={() => openApproveModal(r)}
                            disabled={busy}
                          >
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.btnSmText}>{busy ? "..." : "Approve"}</Text>
                          </Pressable>

                          <Pressable
                            style={[styles.btnSm, styles.danger, busy && { opacity: 0.7 }]}
                            onPress={() => onReject(r._id)}
                            disabled={busy}
                          >
                            <Ionicons name="close" size={14} color="#fff" />
                            <Text style={styles.btnSmText}>{busy ? "..." : "Reject"}</Text>
                          </Pressable>
                        </>
                      )}

                      {r.status === "approved" && (
                        <Pressable
                          style={[styles.btnSm, styles.info, busy && { opacity: 0.7 }]}
                          onPress={() => openMarkPaidModal(r)}
                          disabled={busy}
                        >
                          <Ionicons name="cash" size={14} color="#fff" />
                          <Text style={styles.btnSmText}>{busy ? "..." : "Mark Paid"}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  head: {
    backgroundColor: "#6C2BD9",
    borderRadius: 8,
    marginBottom: 6,
  },
  th: {
    color: "#fff",
    fontWeight: "800",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  zebra: { backgroundColor: "#f0fdf4" },
  td: { paddingHorizontal: 12, color: "#111827" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  badgeText: { fontWeight: "800" },

  btnSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnSmText: { color: "#fff", fontWeight: "700" },

  success: { backgroundColor: "#25D366" },
  danger: { backgroundColor: "#ef4444" },
  info: { backgroundColor: "#EC4899" },
  gray: { backgroundColor: "#e5e7eb" },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: "600", minWidth: 70 },
  value: { flex: 1, fontSize: 14, color: "#111827" },
  actions: { marginTop: 12 },
});

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? "#6C2BD9" : "#e5e7eb",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : "#111827" }}>
        {label}
      </Text>
    </Pressable>
  );
}

// same badge colors as before
function badgeStyle(status: "Pending" | "Approved" | "Rejected" | "Paid") {
  switch (status) {
    case "Approved":
      return { backgroundColor: "#d1fae5", borderColor: "#10b981" };
    case "Rejected":
      return { backgroundColor: "#fee2e2", borderColor: "#ef4444" };
    case "Paid":
      return { backgroundColor: "#dbeafe", borderColor: "#3b82f6" };
    default:
      return { backgroundColor: "#fef3c7", borderColor: "#f59e0b" };
  }
}
function badgeTextStyle(status: "Pending" | "Approved" | "Rejected" | "Paid") {
  switch (status) {
    case "Approved":
      return { color: "#065f46" };
    case "Rejected":
      return { color: "#7f1d1d" };
    case "Paid":
      return { color: "#1e40af" };
    default:
      return { color: "#92400e" };
  }
}
