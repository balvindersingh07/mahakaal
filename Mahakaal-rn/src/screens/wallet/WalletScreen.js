// src/screens/wallet/WalletScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../api";
import { THEME } from "../../theme";
import { useWallet } from "../../context/WalletContext";

// ✅ prefer env like other screens, fallback same number
const ADMIN_WA_NUMBER =
  process.env.EXPO_PUBLIC_ADMIN_WA ||
  "+919784903092";

// digits-only helper
const onlyDigits = (s) => (String(s || "").match(/\d+/g) || []).join("");

// ✅ normalize phone: whatsapp:// expects countrycode+number WITHOUT "+"
const cleanPhoneDigits = (p) => String(p || "").replace(/[^\d]/g, "");

// robust open: native = whatsapp:// (fallback wa.me), web = wa.me
async function openWhatsAppMessage(text) {
  const digits = cleanPhoneDigits(ADMIN_WA_NUMBER); // ✅ "91978..."
  const enc = encodeURIComponent(text);

  // whatsapp deep link (digits only)
  const deep = `whatsapp://send?phone=${digits}&text=${enc}`;
  const web = `https://wa.me/${digits}?text=${enc}`;

  try {
    if (Platform.OS === "web") {
      await Linking.openURL(web);
    } else {
      const can = await Linking.canOpenURL(deep);
      await Linking.openURL(can ? deep : web);
    }
  } catch {
    await Linking.openURL(web);
  }
}

// ✅ IMPORTANT: wallet value pick (supports multiple shapes)
const pickWallet = (data) => {
  if (!data) return null;

  // /me often returns { success, user }
  if (data.user?.wallet != null) return data.user.wallet;

  // direct shapes
  if (data.wallet != null) return data.wallet;

  // wrappers
  if (data.data?.wallet != null) return data.data.wallet;
  if (data.user?.wallet != null) return data.user.wallet;

  // fallbacks
  if (data.balance != null) return data.balance;
  if (data.walletBalance != null) return data.walletBalance;

  return null;
};

// ✅ pick "user object" to store safely
const pickUserObject = (data) => {
  if (!data) return {};
  if (data.user && typeof data.user === "object") return data.user; // {success,user}
  if (typeof data === "object") return data; // direct user object
  return {};
};

export default function WalletScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(width - 32, 400);
  const { balance, setBalance } = useWallet();
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const [scanner, setScanner] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [mode, setMode] = useState("add"); // "add" | "withdraw"
  const [amount, setAmount] = useState("");
  const [upi, setUpi] = useState("");

  // ✅ FIXED: Only call /me (fallback /api/me) and read `wallet`
  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);

      let data = null;

      // 1) /auth/me (correct path)
      try {
        const r = await api.get("/auth/me");
        data = r?.data;
      } catch {}

      // 2) fallback /wallet
      if (!data) {
        try {
          const r2 = await api.get("/wallet");
          data = r2?.data;
        } catch {}
      }

      const w = pickWallet(data);
      const n = Number(w);

      if (Number.isFinite(n)) {
        setBalance(n); // ✅ update global WalletContext (shows instantly on Home, Play bar, etc.)

        // ✅ keep AsyncStorage user synced
        try {
          const raw = await AsyncStorage.getItem("user");
          const oldUser = raw ? JSON.parse(raw) : {};
          const freshUser = pickUserObject(data);

          const merged = { ...(oldUser || {}), ...(freshUser || {}) };
          merged.wallet = n;

          await AsyncStorage.setItem("user", JSON.stringify(merged));
        } catch {}
      } else {
        // last fallback: AsyncStorage
        try {
          const raw = await AsyncStorage.getItem("user");
          const u = raw ? JSON.parse(raw) : null;
          const stored = Number(u?.wallet ?? u?.walletBalance ?? u?.balance ?? 0);
          setBalance(Number.isFinite(stored) ? stored : 0);
        } catch {
          setBalance(0);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScanner = useCallback(async () => {
    try {
      setScannerLoading(true);
      const r = await api.get("/scanner");
      setScanner(r?.data?.scanner || null);
    } catch {
      setScanner(null);
    } finally {
      setScannerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchScanner();
  }, [fetchBalance]);

  useFocusEffect(
    useCallback(() => {
      fetchBalance();
      fetchScanner();
    }, [fetchBalance])
  );
  useAutoRefresh(
    useCallback(() => Promise.all([fetchBalance(), fetchScanner()]), [fetchBalance, fetchScanner]),
    { intervalMs: 15000 }
  );

  const openAsk = (m) => {
    setMode(m);
    setAmount("");
    setUpi("");
    setAskOpen(true);
  };

  const confirmWhatsApp = async () => {
    const n = parseInt(onlyDigits(amount) || "0", 10);
    if (!n || n <= 0) return Alert.alert("Amount", "Valid amount dalo.");

    let note = "Requested via WhatsApp";
    if (mode === "withdraw") {
      const u = String(upi || "").trim();
      const upiOk = /^[\w.\-_]{2,}@[\w.\-]{2,}$/.test(u);
      if (!upiOk) return Alert.alert("Withdraw", "Valid UPI ID dalo (e.g. name@bank).");
      note = `UPI: ${u}`;
    }

    const msg =
      mode === "add"
        ? `Hi, please add ₹${n} to my wallet.`
        : `Hi, please withdraw ₹${n} from my wallet.${note !== "Requested via WhatsApp" ? "\n" + note : ""}`;

    try {
      setPosting(true);

      await api.post("/payment-requests", {
        type: mode,
        amount: n,
        mode: "whatsapp",
        note,
      });

      await openWhatsAppMessage(msg);

      setAskOpen(false);
      setAmount("");
      setUpi("");

      // balance won’t update instantly, but refresh anyway
      fetchBalance();
    } catch (e) {
      const err =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create request.";

      Alert.alert(
        "Payment Request",
        `${err}\n\nDo you still want to contact on WhatsApp?`,
        [
          { text: "Cancel" },
          {
            text: "WhatsApp",
            onPress: async () => {
              await openWhatsAppMessage(msg);
              setAskOpen(false);
              setAmount("");
            },
          },
        ]
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.wrap}>
        <View style={[s.cardWrap, { maxWidth: cardMaxW }]}>
        <View style={s.card}>
          <View style={s.titleRow}>
            <Text style={s.title}>
              <Ionicons name="wallet-outline" size={20} /> My Wallet
            </Text>

            <TouchableOpacity
              onPress={() => {
                fetchBalance();
                fetchScanner();
              }}
              disabled={loading || scannerLoading}
              style={s.refreshBtn}
            >
              {loading || scannerLoading ? (
                <ActivityIndicator size="small" color={THEME.primary} />
              ) : (
                <Ionicons name="refresh" size={18} color={THEME.primary} />
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.balance}>₹{Number(balance || 0).toFixed(2)}</Text>

          {/* Scanner / QR section (Admin-controlled) */}
          <View style={s.qrCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={s.qrTitle}>
                <Ionicons name="qr-code-outline" size={18} /> Pay via QR
              </Text>
              {scannerLoading ? <ActivityIndicator size="small" /> : null}
            </View>

            {scanner?.imageUrl ? (
              <>
                <Image
                  source={{ uri: String(scanner.imageUrl) }}
                  style={s.qrImg}
                  resizeMode="contain"
                />
                {!!scanner?.upiId ? (
                  <Text style={s.qrSub}>UPI ID: {String(scanner.upiId)}</Text>
                ) : null}
                {!!scanner?.note ? (
                  <Text style={s.qrNote}>{String(scanner.note)}</Text>
                ) : null}
                <Text style={s.qrHint}>
                  Scan the QR, make payment, then tap “Add Money via WhatsApp” to request wallet credit.
                </Text>
              </>
            ) : (
              <Text style={s.qrEmpty}>
                QR not available right now. Please contact admin on WhatsApp.
              </Text>
            )}
          </View>

          <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={() => openAsk("add")} activeOpacity={0.9}>
            <Text style={s.btnTxt}>💰 Add Money via WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.btnRed]} onPress={() => openAsk("withdraw")} activeOpacity={0.9}>
            <Text style={s.btnTxt}>💸 Withdraw Money</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnLink} onPress={() => navigation.navigate("Withdraw")} activeOpacity={0.8}>
            <Text style={s.btnLinkTxt}>Need UPI form? Open Withdraw Screen →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnLink} onPress={() => navigation.navigate("MyRequests")} activeOpacity={0.8}>
            <Text style={s.btnLinkTxt}>📋 My Payment Requests</Text>
          </TouchableOpacity>
        </View>
        </View>

        <Modal visible={askOpen} transparent animationType="fade" onRequestClose={() => setAskOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={s.modalWrap}
          >
            <View style={s.modalCard}>
              <Text style={s.mTitle}>
                {mode === "add" ? "Add Money via WhatsApp" : "Withdraw via WhatsApp"}
              </Text>

              <Text style={s.label}>Amount (₹)</Text>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(onlyDigits(t))}
                placeholder="₹0"
                keyboardType={Platform.select({ ios: "number-pad", default: "numeric" })}
                style={s.input}
              />

              {mode === "withdraw" && (
                <>
                  <Text style={s.label}>UPI ID (e.g. name@bank)</Text>
                  <TextInput
                    value={upi}
                    onChangeText={setUpi}
                    placeholder="name@paytm"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={s.input}
                  />
                </>
              )}

              <View style={s.mRow}>
                <TouchableOpacity style={[s.mBtn, s.mCancel]} onPress={() => setAskOpen(false)} disabled={posting}>
                  <Text style={s.mTxt}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.mBtn, s.mPrimary, posting && { opacity: 0.8 }]}
                  onPress={confirmWhatsApp}
                  disabled={posting}
                >
                  <Text style={s.mTxt}>{posting ? "Please wait..." : "WhatsApp"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },

  wrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: THEME.bg,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },

  cardWrap: { width: "100%", alignSelf: "center" },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: THEME.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: THEME.primary },
  refreshBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#DCF8C6",
  },
  balance: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.primary,
    marginVertical: 10,
    textAlign: "center",
  },

  btn: { paddingVertical: 12, borderRadius: 10, marginTop: 10, alignItems: "center" },
  btnGreen: { backgroundColor: THEME.primary },
  btnRed: { backgroundColor: "#dc2626" },
  btnTxt: { color: "#fff", fontWeight: "800" },

  qrCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
  },
  qrTitle: { fontSize: 14, fontWeight: "900", color: THEME.primary },
  qrImg: {
    width: "100%",
    height: 200,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 10,
  },
  qrSub: { marginTop: 8, fontWeight: "800", color: "#111827" },
  qrNote: { marginTop: 4, color: "#374151", fontWeight: "600" },
  qrHint: { marginTop: 6, fontSize: 11, color: "#6b7280", fontWeight: "700" },
  qrEmpty: { marginTop: 8, color: "#6b7280", fontWeight: "700" },

  btnLink: { marginTop: 10, alignItems: "center" },
  btnLinkTxt: { color: THEME.pink, fontWeight: "800" },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  mTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10, color: THEME.primary },
  label: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: THEME.primary, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 12 },
  mRow: { flexDirection: "row", justifyContent: "space-between" },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", marginHorizontal: 4 },
  mPrimary: { backgroundColor: THEME.primary },
  mCancel: { backgroundColor: "#9ca3af" },
  mTxt: { color: "#fff", fontWeight: "900" },
});
