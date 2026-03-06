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
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api, { API, getUser, saveSession } from "../../api";
import { THEME } from "../../theme";

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
  const [me, setMe] = useState(null);
  const [balance, setBalance] = useState(0);
  const [gameTitle, setGameTitle] = useState("DISAWAR");
  const [winningNumbers, setWinningNumbers] = useState("");
  const [loading, setLoading] = useState(true);

  const POLL_MS = 15000;

  // Refresh user + wallet on focus + poll for real-time sync
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const run = async () => {
        let userSafe = null;

        try {
          setLoading(true);

          // 1) read cached user
          const u = await getUser();
          userSafe = u || null;
          if (alive) setMe(userSafe);

          // 1b) if user missing OR username missing -> fetch /me and cache it
          if (!userSafe || !userSafe?.username) {
            try {
              const meRes = API?.me ? await API.me() : await api.get("/me");
              const fresh = meRes?.data ?? null;

              if (fresh) {
                userSafe = fresh;
                await saveSession({ user: fresh });
                if (alive) setMe(fresh);
              }
            } catch {
              // ignore
            }
          }

          // ✅ 2) wallet (STABLE) -> use /me wallet first
          if (alive) setBalance(userSafe?.wallet ?? 0);

          // optional: if /wallet endpoint exists, overwrite balance
          try {
            const w = await API.wallet();
            const bal = w?.data?.balance ?? w?.balance;
            if (bal !== undefined && alive) setBalance(bal);
          } catch {
            // ignore
          }

          // 3) game name + today's winning numbers
          try {
            const g = await API.games();
            const list = Array.isArray(g?.data) ? g.data : g?.games || [];
            const first = list[0] || null;
            if (alive && first?.name) setGameTitle(first.name);

            if (alive && first) {
              const slug = toSlug(first.slug || first.gameId || first.name);
              try {
                const todayRes = await api.get("/results/today", {
                  params: { gameId: slug, limit: 10 },
                });
                const rows = todayRes?.data?.rows || todayRes?.data?.results || todayRes?.data?.data || [];
                const nums = rows.map((r) => r.result || r.value).filter(Boolean);
                if (alive && nums.length) setWinningNumbers(nums.join(", "));
                else if (alive) setWinningNumbers("");
              } catch {
                if (alive) setWinningNumbers("");
              }
            }
          } catch {
            // ignore
          }
        } finally {
          if (alive) setLoading(false);
        }
      };

      run();
      const tid = setInterval(run, POLL_MS);

      return () => {
        alive = false;
        clearInterval(tid);
      };
    }, [])
  );

  const goChangePassword = () => nav.navigate("ChangePassword");
  const goResultHistory = () => nav.navigate("ResultHistory");

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
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

            {/* game name + winning numbers */}
            <View style={s.rowBox}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLeft} numberOfLines={1}>
                  {gameTitle}
                </Text>
                {winningNumbers ? (
                  <Text style={s.winningNums}>Winning: {winningNumbers}</Text>
                ) : null}
              </View>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={s.rowRight}>{winningNumbers ? "✓" : "•"}</Text>
              )}
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
  rowLeft: { color: "#b91c1c", fontWeight: "900", letterSpacing: 1 },
  winningNums: { fontSize: 12, color: "#059669", fontWeight: "700", marginTop: 4 },
  rowRight: { color: "#b91c1c", fontWeight: "800", marginLeft: 10 },
});
