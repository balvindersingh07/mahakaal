// src/screens/help/HelpScreen.js
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { THEME } from "../../theme";
import { SafeAreaView } from "react-native-safe-area-context";

const LOGO = require("../../../assets/icon-512.png");
const APP_BG = THEME.bg;
const MAX_WIDTH = 720;

// ✅ Support number: prefer .env → fallback to hardcoded
const SUPPORT_WA = process.env.EXPO_PUBLIC_SUPPORT_WA || "+919784903092";

/* ---------- helpers ---------- */
const cleanPhone = (p) => String(p || "").replace(/[^+\d]/g, ""); // keep '+' and digits

async function openWhatsAppMessage(text, phone = SUPPORT_WA) {
  const e164 = cleanPhone(phone); // +911234567890
  const digits = e164.replace(/^\+/, ""); // 911234567890
  const enc = encodeURIComponent(text);

  const deep = `whatsapp://send?phone=${e164}&text=${enc}`;
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

export default function HelpScreen() {
  const navigation = useNavigation();

  const goBackHome = useCallback(() => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate?.("MainTabs", { screen: "Home" });
  }, [navigation]);

  const openWhatsApp = useCallback(() => {
    openWhatsAppMessage("Hi, I need help with my account.");
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={s.wrap}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ✅ Center frame so screen never looks stretched */}
        <View style={s.frame}>
          {/* Header with single back + centered logo */}
          <View style={s.header}>
            <TouchableOpacity onPress={goBackHome} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View style={{ width: 40 }} />
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.title}>Need Help?</Text>
            <Text style={s.text}>
              If you have any issues or questions, chat with our support team on WhatsApp.
            </Text>

            <TouchableOpacity style={s.btn} onPress={openWhatsApp} activeOpacity={0.9}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.btnTxt}>Chat on WhatsApp</Text>
            </TouchableOpacity>

            <Text style={[s.text, { marginTop: 10 }]}>
              We are available <Text style={{ fontWeight: "800" }}>24x7</Text> to assist you.
            </Text>

            <Text style={[s.text, { marginTop: 8, fontSize: 12 }]}>
              Support Number: <Text style={{ fontWeight: "800" }}>{SUPPORT_WA}</Text>
            </Text>
          </View>

          {/* bottom spacing for gesture bar */}
          <SafeAreaView edges={["bottom"]} style={{ height: 14 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },
  wrap: { flex: 1, backgroundColor: APP_BG },

  // ✅ keeps scroll working on small phones + centers content on big phones
  scrollContent: { flexGrow: 1, alignItems: "center", paddingBottom: 40 },

  // ✅ global center frame
  frame: { width: "100%", maxWidth: MAX_WIDTH },

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

  card: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: 14,
    alignItems: "center",
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

  title: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 8 },
  text: { textAlign: "center", color: "#4b5563" },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
