// src/screens/home/HomeScreen.js  (adjust path if needed)
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api, { API, getUser, saveSession } from "../../api";
import { THEME } from "../../theme";
import { useWallet } from "../../context/WalletContext";

function toSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const APP_BG = THEME.bg;
const INR = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function HomeScreen() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 480);
  const { balance, setBalance } = useWallet();
  const [me, setMe] = useState(null);
  const [gameTitle, setGameTitle] = useState("DISAWAR");
  const [winningNumbers, setWinningNumbers] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Poll every 5 sec so users get results as soon as admin declares
  const POLL_MS = 5000;

  const fetchResults = useCallback(async (first) => {
    if (!first) return;
    const slug = toSlug(first.slug || first.gameId || first.name);
    try {
      const todayRes = await api.get("/results/today", {
        params: { gameId: slug, limit: 20 },
      });
      const rows = todayRes?.data?.rows || todayRes?.data?.results || todayRes?.data?.data || [];
      const nums = rows.map((r) => r.result || r.value).filter(Boolean);
      return nums.length ? nums.join(", ") : "";
    } catch {
      return "";
    }
  }, []);

  const runRefresh = useCallback(async () => {
    let userSafe = null;
    try {
      setLoading(true);
      const u = await getUser();
      userSafe = u || null;
      if (userSafe) setMe(userSafe);

      if (!userSafe || !userSafe?.username) {
        try {
          const meRes = API?.me ? await API.me() : await api.get("/auth/me");
          const fresh = meRes?.data ?? null;
          if (fresh) {
            userSafe = fresh;
            await saveSession({ user: fresh });
            setMe(fresh);
          }
        } catch {}
      }

      let bal = userSafe?.wallet ?? 0;
      try {
        const w = await API.wallet();
        const apiBal = w?.data?.balance ?? w?.balance ?? w?.data?.wallet;
        if (apiBal !== undefined) bal = apiBal;
      } catch {}
      setBalance(bal);

      const g = await API.games();
      const list = Array.isArray(g?.data) ? g.data : g?.games || [];
      const first = list[0] || null;
      if (first?.name) setGameTitle(first.name);

      if (first) {
        const nums = await fetchResults(first);
        setWinningNumbers(nums || "");
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchResults]);

  // Refresh on focus + poll every 5 sec for fast result updates
  useFocusEffect(
    useCallback(() => {
      runRefresh();
      const tid = setInterval(runRefresh, POLL_MS);
      return () => clearInterval(tid);
    }, [runRefresh])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    runRefresh();
  }, [runRefresh]);

  const goChangePassword = () => nav.navigate("ChangePassword");
  const goResultHistory = () => nav.navigate("ResultHistory");

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.primary]}
            tintColor={THEME.primary}
          />
        }
      >
        <View style={[s.container, { maxWidth: maxW }]}>
          {/* top avatar logo */}
          <View style={s.logoWrap}>
            <Image
              source={require("../../../assets/icon-512.png")}
              style={s.logo}
            />
          </View>

          {/* main card */}
          <View style={s.card}>
            <Text style={s.avatar}>👤</Text>

            {/* ✅ Real username/phone (NO hardcode) */}
            <Text style={s.name} numberOfLines={1}>
              {me?.username || me?.phone || "User"}
            </Text>

            {/* ✅ Real wallet balance */}
            <Text style={s.balance}>
              💰{" "}
              <Text style={s.balanceValue}>
                {loading ? "…" : INR(balance)}
              </Text>
            </Text>

            {/* change password */}
            <TouchableOpacity
              style={s.gradBtn}
              activeOpacity={0.9}
              onPress={goChangePassword}
            >
              <Text style={s.gradText}>🔐 Change Password</Text>
            </TouchableOpacity>

            {/* game name + today's results - visible to all users, updates every 5 sec */}
            <View style={s.rowBox}>
              <View style={{ flex: 1 }}>
                <View style={s.gameRow}>
                  <View style={[s.statusDot, winningNumbers ? s.dotGreen : s.dotGrey]} />
                  <Text style={s.rowLeft} numberOfLines={1}>
                    {gameTitle}
                  </Text>
                </View>
                {winningNumbers ? (
                  <Text style={s.winningNums}>Result: {winningNumbers}</Text>
                ) : (
                  <Text style={s.winningNumsPlaceholder}>
                    {loading ? "Checking…" : "Results will appear when declared"}
                  </Text>
                )}
              </View>
              {loading && !winningNumbers ? (
                <ActivityIndicator size="small" color={THEME.primary} />
              ) : null}
            </View>

            {/* More -> Result History */}
            <TouchableOpacity
              style={[s.gradBtn, { marginTop: 16 }]}
              activeOpacity={0.9}
              onPress={goResultHistory}
            >
              <Text style={s.gradText}>📊 More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },
  scroll: { flex: 1, backgroundColor: APP_BG },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  container: {
    width: "100%",
    alignSelf: "center",
  },

  logoWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: APP_BG,
  },
  logo: { width: 96, height: 96, borderRadius: 48 },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  avatar: { fontSize: 46, alignSelf: "center", marginTop: 6 },
  name: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
    marginTop: 6,
  },
  balance: {
    textAlign: "center",
    marginTop: 6,
    fontSize: 18,
    color: "#374151",
  },
  balanceValue: { color: THEME.primary, fontWeight: "800" },

  gradBtn: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: THEME.primary,
  },
  gradText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  rowBox: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#eef2f7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: "#059669" },
  dotGrey: { backgroundColor: "#9ca3af" },
  rowLeft: { color: "#b91c1c", fontWeight: "900", letterSpacing: 1, flex: 1 },
  winningNums: { fontSize: 14, color: "#059669", fontWeight: "800", marginTop: 6 },
  winningNumsPlaceholder: { fontSize: 12, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
});
