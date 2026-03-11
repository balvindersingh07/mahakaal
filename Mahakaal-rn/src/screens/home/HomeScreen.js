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

// Fallback 9 games when API returns empty
const DEFAULT_GAMES = [
  { name: "OLD DISAWAR", slug: "old_disawar", gameId: "old_disawar" },
  { name: "FARIDABAD", slug: "faridabad", gameId: "faridabad" },
  { name: "DISAWAR", slug: "disawar", gameId: "disawar" },
  { name: "GHAZIABAD", slug: "ghaziabad", gameId: "ghaziabad" },
  { name: "GALI", slug: "gali", gameId: "gali" },
  { name: "SHREE GANESH", slug: "shree_ganesh", gameId: "shree_ganesh" },
  { name: "DELHI BAZAR", slug: "delhi_bazar", gameId: "delhi_bazar" },
  { name: "PATNA", slug: "patna", gameId: "patna" },
  { name: "NEW FARIDABAD", slug: "new_faridabad", gameId: "new_faridabad" },
];

export default function HomeScreen() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 480);
  const { balance, setBalance } = useWallet();
  const [me, setMe] = useState(null);
  const [gameResults, setGameResults] = useState([]); // [{ gameName, gameId, result }]
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Poll every 5 sec so users get results as soon as admin declares
  const POLL_MS = 5000;

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

      // Fetch ALL games and ALL today's results
      const [gRes, todayRes] = await Promise.all([
        API.games(),
        api.get("/results/today", { params: { limit: 100 } }),
      ]);

      // Extract games array from API (axios: gRes.data = { data, games, ... })
      const body = gRes?.data || gRes;
      const games = Array.isArray(body?.data) ? body.data
        : Array.isArray(body?.games) ? body.games
        : Array.isArray(body?.rows) ? body.rows
        : Array.isArray(body?.items) ? body.items
        : [];

      const resultsRaw = todayRes?.data;
      const results = Array.isArray(resultsRaw?.rows) ? resultsRaw.rows
        : Array.isArray(resultsRaw?.results) ? resultsRaw.results
        : Array.isArray(resultsRaw?.data) ? resultsRaw.data
        : Array.isArray(resultsRaw) ? resultsRaw
        : [];

      const byGameId = {};
      for (const r of results) {
        const gid = toSlug(r.gameId || r.gameName || "");
        if (gid && !byGameId[gid]) byGameId[gid] = r.result || r.value || "";
      }

      const gamesList = games.length > 0 ? games : DEFAULT_GAMES;
      const merged = gamesList.map((game, idx) => {
        const slug = toSlug(game.slug || game.gameId || game.name);
        const result = byGameId[slug] || "";
        const displayName = String(game.name || game.gameName || game.gameId || game.slug || "").trim() || `Game ${idx + 1}`;
        return {
          gameName: displayName,
          gameId: slug || `game_${idx + 1}`,
          result,
        };
      });
      setGameResults(merged);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setBalance]);

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

            {/* Today's Results - ALL games table (12 AM - 12 AM), updates every 5 sec */}
            <Text style={s.sectionTitle}>Today&apos;s Results</Text>
            {loading && gameResults.length === 0 ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={s.loadingText}>Loading…</Text>
              </View>
            ) : (
              <View style={s.resultsTable}>
                {gameResults.map((item, idx) => (
                  <View
                    key={item.gameId || idx}
                    style={[s.resultRow, idx === gameResults.length - 1 && s.resultRowLast]}
                  >
                    <View style={s.gameRow}>
                      <View style={[s.statusDot, item.result ? s.dotGreen : s.dotGrey]} />
                      <Text style={s.rowLeft} numberOfLines={1}>
                        {item.gameName || item.gameId || `Game ${idx + 1}`}
                      </Text>
                    </View>
                    <Text style={item.result ? s.winningNums : s.winningNumsPlaceholder}>
                      {item.result ? `Result: ${item.result}` : (loading ? "Checking…" : "Results will appear when declared")}
                    </Text>
                  </View>
                ))}
                {gameResults.length === 0 && !loading && (
                  <Text style={s.emptyText}>No games configured</Text>
                )}
              </View>
            )}

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

  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: { fontSize: 14, color: "#6b7280", fontWeight: "600" },
  resultsTable: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eef2f7",
    overflow: "hidden",
  },
  resultRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  resultRowLast: { borderBottomWidth: 0 },
  emptyText: { padding: 16, color: "#9ca3af", textAlign: "center", fontWeight: "600" },
  gameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: "#059669" },
  dotGrey: { backgroundColor: "#9ca3af" },
  rowLeft: { color: "#b91c1c", fontWeight: "900", letterSpacing: 1, flex: 1 },
  winningNums: { fontSize: 14, color: "#059669", fontWeight: "800", marginTop: 6 },
  winningNumsPlaceholder: { fontSize: 12, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
});
