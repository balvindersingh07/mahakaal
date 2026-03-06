// src/screens/commission/CommissionScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../api";
import { THEME } from "../../theme";

const LOGO = require("../../../assets/icon-512.png");

// ✅ match App.js global max width
const MAX_WIDTH = 720;

function money(n) {
  const x = Number(n || 0);
  return `₹${x.toFixed(2)}`;
}

function nowLabel(lastUpdatedAt) {
  if (!lastUpdatedAt) return "Updated just now";
  const diff = Date.now() - new Date(lastUpdatedAt).getTime();
  if (diff < 60 * 1000) return "Updated just now";
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs} hr ago`;
}

const goBack = (nav) => {
  if (nav?.canGoBack?.()) nav.goBack();
  else nav?.navigate?.("MainTabs", { screen: "Home" });
};

export default function CommissionScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState({
    current: 0,
    totalEarned: 0,
    pending: 0,
    referralCode: "—",
    updatedAt: null,
  });

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

      const r = await API.getCommissionSummary();
      const res = r?.data || {};
      const summary = res?.summary || {};

      // Also fetch referralCode from /auth/me
      let referralCode = "—";
      try {
        const meRes = await API.me();
        const user = meRes?.data?.user || meRes?.data || {};
        referralCode = user?.referralCode || user?.refCode || user?.referral_code || "—";
      } catch {}

      setData({
        current: summary?.totalAll ?? res?.current ?? 0,
        totalEarned: summary?.totalAll ?? res?.totalEarned ?? 0,
        pending: summary?.pendingAll ?? res?.pending ?? 0,
        referralCode,
        updatedAt: res?.updatedAt || new Date().toISOString(),
      });
    } catch (e) {
      setData((p) => ({ ...p, updatedAt: new Date().toISOString() }));
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load({ silent: true });
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ silent: true });
  }, [load]);

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ✅ Center frame: all content stays inside maxWidth */}
        <View style={s.frame}>
          {/* Header: single back arrow + centered logo */}
          <SafeAreaView edges={["top"]} style={s.header}>
            <TouchableOpacity onPress={() => goBack(navigation)} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Title */}
          <View style={s.titleRow}>
            <Ionicons
              name="wallet-outline"
              size={18}
              color="#111827"
              style={{ marginRight: 6 }}
            />
            <Text style={s.title}>Commission</Text>
          </View>

          {/* Content */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Current Commission</Text>
            <Text style={s.big}>{money(data.current)}</Text>
            <Text style={s.muted}>{loading ? "Loading..." : nowLabel(data.updatedAt)}</Text>
          </View>

          <View style={s.row2}>
            <View style={[s.card, s.flex1, s.cardNoMargin]}>
              <Text style={s.cardTitle}>Total Earned</Text>
              <Text style={s.big}>{money(data.totalEarned)}</Text>
            </View>

            <View style={[s.card, s.flex1, s.cardNoMargin]}>
              <Text style={s.cardTitle}>Pending</Text>
              <Text style={s.big}>{money(data.pending)}</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Referral Code</Text>
            <Text style={s.code}>{data.referralCode || "—"}</Text>
            <Text style={s.muted}>
              Share code with friends to earn commission on their plays.
            </Text>
          </View>

          {/* bottom spacing for gesture bar */}
          <SafeAreaView edges={["bottom"]} style={{ height: 14 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  scroll: { flex: 1 },
  // ✅ makes small phones scroll correctly and keeps content centered
  scrollContent: { flexGrow: 1, alignItems: "center", paddingBottom: 24 },

  // ✅ global center frame
  frame: { width: "100%", maxWidth: MAX_WIDTH },

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

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
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

  // ✅ for row cards: we manage horizontal padding via row2
  cardNoMargin: { marginHorizontal: 0, marginBottom: 0 },

  cardTitle: { fontWeight: "800", color: "#111827", marginBottom: 6 },
  big: { fontSize: 22, fontWeight: "900", color: "#0f766e" },
  muted: { color: "#6b7280", marginTop: 4 },

  row2: { flexDirection: "row", gap: 12, paddingHorizontal: 12, marginBottom: 12 },
  flex1: { flex: 1 },

  code: {
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    fontSize: 16,
    fontWeight: "800",
    backgroundColor: THEME.bg,
    color: "#3730a3",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
});
