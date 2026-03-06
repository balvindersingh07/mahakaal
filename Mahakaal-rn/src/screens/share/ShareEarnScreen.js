// src/screens/referral/ShareEarnScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Linking,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { API, getUser } from "../../api";
import { THEME } from "../../theme";

const LOGO = require("../../../assets/icon-512.png");

const REF_BASE_ENV =
  process.env.EXPO_PUBLIC_REF_URL ||
  process.env.EXPO_PUBLIC_REF_BASE ||
  "https://mahakaal.app/referral?code=";

function buildRefLink(code, refLinkFromServer) {
  if (refLinkFromServer && /^https?:\/\//i.test(refLinkFromServer)) return refLinkFromServer;
  if (!code) return "https://mahakaal.app";
  if (REF_BASE_ENV.endsWith("=")) return `${REF_BASE_ENV}${encodeURIComponent(code)}`;
  const slash = REF_BASE_ENV.endsWith("/") ? "" : "/";
  return `${REF_BASE_ENV}${slash}${encodeURIComponent(code)}`;
}

async function shareViaWhatsApp(text) {
  const enc = encodeURIComponent(text);
  const deep = `whatsapp://send?text=${enc}`;
  const web = `https://wa.me/?text=${enc}`;
  try {
    const can = await Linking.canOpenURL(deep);
    await Linking.openURL(can ? deep : web);
  } catch {
    await Linking.openURL(web);
  }
}

export default function ShareEarnScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [code, setCode] = useState(route.params?.code || "");
  const [refLinkServer, setRefLinkServer] = useState("");
  const [stats, setStats] = useState(null); // { invited, commission }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const goBackHome = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate?.("MainTabs", { screen: "Home" });
  };

  const link = useMemo(() => buildRefLink(code, refLinkServer), [code, refLinkServer]);

  const loadReferral = useCallback(async () => {
    setErr("");
    try {
      setLoading(true);

      let foundCode = route.params?.code || "";

      // ✅ 1) BEST: Commission summary
      try {
        const r = await API.getCommissionSummary?.();
        const d = r?.data ?? r;

        const c = d?.referralCode || d?.user?.referralCode || d?.code || "";
        if (!foundCode && c) foundCode = String(c);

        const invited =
          d?.invited ??
          d?.invites ??
          d?.invitedCount ??
          d?.totalReferrals ??
          d?.referrals ??
          0;

        const commission =
          d?.commission ??
          d?.totalCommission ??
          d?.earned ??
          0;

        if (invited != null || commission != null) {
          setStats({
            invited: Number(invited || 0),
            commission: Number(commission || 0),
          });
        }
      } catch {}

      // ✅ 2) Local stored user
      if (!foundCode) {
        try {
          const u = await getUser?.();
          const c = u?.referralCode || u?.refCode || u?.inviteCode || u?.code || "";
          if (c) foundCode = String(c);
          setRefLinkServer(u?.refLink || u?.referralLink || "");
        } catch {}
      }

      // ✅ 3) Fallback: /api/me
      if (!foundCode || !refLinkServer) {
        try {
          const me = await API.me?.();
          const d = me?.data?.user ?? me?.data ?? {};
          const c = d?.referralCode || d?.refCode || d?.inviteCode || d?.code || "";
          if (!foundCode && c) foundCode = String(c);
          setRefLinkServer(refLinkServer || d?.refLink || d?.referralLink || "");
        } catch {}
      }

      setCode(foundCode || "YOURCODE");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load referral info.");
      setCode("YOURCODE");
    } finally {
      setLoading(false);
    }
  }, [route.params?.code, refLinkServer]);

  useEffect(() => {
    loadReferral();
  }, [loadReferral]);

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
      if (Platform.OS === "web") window.alert("✅ Referral link copied!");
      else Alert.alert("Copied", "Referral link copied!");
    } catch {
      Alert.alert("Copy failed", "Please copy it manually.");
    }
  };

  const shareWhatsApp = async () => {
    const message = `Mahakaal join karo! Mere referral link naal 5% commission earn karo.\n${link}`;
    await shareViaWhatsApp(message);
  };

  const shareGeneric = async () => {
    const message = `Mahakaal join karo! Mere referral link: ${link}`;
    try {
      await Share.share({ message });
    } catch {}
  };

  const openTerms = () => {
    const url = process.env.EXPO_PUBLIC_TERMS_URL || "https://mahakaal.app/terms";
    Linking.openURL(url).catch(() =>
      Alert.alert("Terms & Conditions", "Link not available yet.")
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.wrap}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ centered header */}
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBackHome} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View style={{ width: 40 }} />
          </View>

          {/* ✅ centered card */}
          <View style={s.card}>
            <Text style={s.heading} numberOfLines={1}>Mahakaal</Text>

            <View style={s.subRow}>
              <FontAwesome5 name="coins" size={14} color={THEME.primary} />
              <Text style={s.subText}>  Share & Earn  </Text>
              <FontAwesome5 name="coins" size={14} color={THEME.primary} />
            </View>

            <TouchableOpacity onPress={openTerms} style={s.termsRow} activeOpacity={0.85}>
              <Ionicons name="document-text-outline" size={16} color="#2563eb" />
              <Text style={s.terms}>  Terms & Conditions</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 6 }}>
              <Text style={s.p}>
                अगर आप <Text style={s.bold}>Mahakaal</Text> को अपने friend को डाउनलोड करवाते हो
                तो आप <Text style={s.bold}>5% कमीशन</Text> कमा सकते हो। ये 5% कमीशन आपको लाइफ़ टाइम मिलेगा।
              </Text>
              <Text style={[s.p, { color: "#b91c1c", marginTop: 4 }]}>
                नोट: 5% कमीशन तभी मिलेगा जब आपका friend गेम खेलता है। और उस गेम से कंपनी को जो Profit होगा,
                उसका 5% आपको मिलेगा।
              </Text>
            </View>

            {!!err && <Text style={s.err}>{err}</Text>}

            {loading ? (
              <View style={{ marginTop: 12, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            ) : stats ? (
              <View style={s.statsRow}>
                <View style={[s.statBox, { marginRight: 8 }]}>
                  <Text style={s.statVal} numberOfLines={1}>{stats.invited}</Text>
                  <Text style={s.statLbl} numberOfLines={1}>Invites</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={s.statVal} numberOfLines={1}>
                    ₹{Number(stats.commission || 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={s.statLbl} numberOfLines={1}>Commission</Text>
                </View>
              </View>
            ) : null}

            <View style={s.codeRow}>
              <Text style={s.codeLbl} numberOfLines={1}>Your Code</Text>
              <Text style={s.codeVal} numberOfLines={1}>{code || "YOURCODE"}</Text>
            </View>

            <View style={s.linkWrap}>
              <Ionicons name="link-outline" size={16} color="#6b7280" />
              <Text style={s.linkLabel}>  अपना Referral लिंक शेयर करें:</Text>
            </View>

            <TextInput
              value={link}
              editable={false}
              selectTextOnFocus
              style={s.input}
            />

            {/* ✅ buttons wrap on small screens */}
            <View style={s.btnRow}>
              <TouchableOpacity style={[s.btn, s.btnCopy]} onPress={copyLink} activeOpacity={0.9}>
                <Ionicons name="copy-outline" size={16} color="#fff" />
                <Text style={s.btnTxt}>  Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.btn, s.btnWA]} onPress={shareWhatsApp} activeOpacity={0.9}>
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={s.btnTxt}>  WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.btn, s.btnShare]} onPress={shareGeneric} activeOpacity={0.9}>
                <Ionicons name="share-outline" size={16} color="#fff" />
                <Text style={s.btnTxt}>  Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  wrap: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingBottom: 40 },

  // ✅ stable width on big screens
  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  backBtn: { padding: 8, marginLeft: 4 },
  logo: { width: 72, height: 72, borderRadius: 36 },

  card: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      web: { boxShadow: "0 10px 24px rgba(0,0,0,0.08)" },
      default: {
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },

  heading: { fontSize: 26, fontWeight: "800", textAlign: "center", color: "#111827" },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6 },
  subText: { color: THEME.primary, fontWeight: "800" },

  termsRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  terms: { color: "#2563eb", fontWeight: "800" },

  p: { color: "#111827", lineHeight: 20, marginTop: 8 },
  bold: { fontWeight: "800" },

  err: { color: "#ef4444", marginTop: 10, fontWeight: "800" },

  statsRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between" },
  statBox: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statVal: { fontWeight: "900", fontSize: 18, color: "#0f172a" },
  statLbl: { color: "#64748b", marginTop: 2 },

  codeRow: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  codeLbl: { color: "#64748b", fontWeight: "700" },
  codeVal: { marginTop: 2, fontWeight: "900", fontSize: 22, color: "#111827", letterSpacing: 1 },

  linkWrap: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  linkLabel: { color: "#111827", fontWeight: "700" },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 44,
    textAlignVertical: "center",
  },

  // ✅ wrap buttons
  btnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  btn: {
    flexGrow: 1,
    flexBasis: 160, // ✅ allows wrap nicely on small screens
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnCopy: { backgroundColor: THEME.primary },
  btnWA: { backgroundColor: THEME.pink },
  btnShare: { backgroundColor: THEME.primary },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
