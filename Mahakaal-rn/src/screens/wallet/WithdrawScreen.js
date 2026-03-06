// src/screens/wallet/WithdrawScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import api from "../../api";
import { THEME } from "../../theme";

// ✅ prefer env like other screens, fallback same number
const ADMIN_WA_NUMBER =
  process.env.EXPO_PUBLIC_ADMIN_WA ||
  "+919784903092";

// digits-only helper
const onlyDigits = (s) => (String(s || "").match(/\d+/g) || []).join("");

// ✅ normalize phone: whatsapp deep link expects digits-only
const cleanPhoneDigits = (p) => String(p || "").replace(/[^\d]/g, "");

// robust: native → whatsapp:// (fallback wa.me), web → wa.me
async function openWhatsAppMessage(text) {
  const digits = cleanPhoneDigits(ADMIN_WA_NUMBER);
  const enc = encodeURIComponent(text);

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

export default function WithdrawScreen() {
  const navigation = useNavigation();

  const [amount, setAmount] = useState("");
  const [upi, setUpi] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const n = parseInt(onlyDigits(amount) || "0", 10);
    if (!n || n <= 0) return Alert.alert("Withdraw", "Valid amount dalo.");
    // optional: if you want minimum
    // if (n < 10) return Alert.alert("Withdraw", "Minimum ₹10.");

    const u = String(upi || "").trim();
    // ✅ simple UPI check
    const upiOk = /^[\w.\-_]{2,}@[\w.\-]{2,}$/.test(u);
    if (!upiOk) return Alert.alert("Withdraw", "Valid UPI ID dalo (e.g., name@bank).");

    const msg = `Hi, please withdraw ₹${n} from my wallet.\nUPI: ${u}`;

    try {
      setLoading(true);

      // ✅ create request in backend
      await api.post("/payment-requests", {
        type: "withdraw",
        amount: n,
        mode: "whatsapp",
        note: `UPI: ${u}`,
      });

      // ✅ open WhatsApp
      await openWhatsAppMessage(msg);

      Alert.alert("Withdraw", "Request sent to admin on WhatsApp.");
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      const err =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create request.";

      Alert.alert(
        "Withdraw",
        `${err}\n\nDo you still want to contact on WhatsApp?`,
        [
          { text: "Cancel" },
          { text: "WhatsApp", onPress: async () => openWhatsAppMessage(msg) },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.wrap}
      >
        <View style={s.card}>
          <Text style={s.title}>Withdraw Money</Text>

          <Text style={s.label}>Amount</Text>
          <TextInput
            style={s.input}
            value={amount}
            onChangeText={(t) => setAmount(onlyDigits(t))}
            keyboardType={Platform.select({ ios: "number-pad", default: "numeric" })}
            placeholder="Amount (₹)"
            placeholderTextColor="#9ca3af"
          />

          <Text style={s.label}>UPI ID</Text>
          <TextInput
            style={s.input}
            value={upi}
            onChangeText={setUpi}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@bank"
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={submit}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnTxt}>Send on WhatsApp</Text>
            )}
          </TouchableOpacity>

          <Text style={s.help}>
            Request WhatsApp te admin kol jāu gi; backend vich entry vi ban ju.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  wrap: { flex: 1, padding: 16, backgroundColor: THEME.bg, justifyContent: "flex-start" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  title: { fontSize: 20, fontWeight: "900", marginBottom: 12, color: "#111827", textAlign: "center" },

  label: { fontWeight: "800", color: "#374151", marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    color: "#111827",
  },

  btn: { backgroundColor: THEME.primary, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 6 },
  btnTxt: { color: "#fff", fontWeight: "900" },

  help: { marginTop: 10, color: "#6b7280", textAlign: "center" },
});
