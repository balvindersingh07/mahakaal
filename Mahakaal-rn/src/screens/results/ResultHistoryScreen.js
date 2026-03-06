// src/screens/results/ResultHistoryScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../api";
import { THEME } from "../../theme";

const LOGO = require("../../../assets/icon-512.png");
const APP_BG = THEME.bg;

// Default fallback — will be replaced by API data on load
const DEFAULT_GAMES = [
  "OLDDISAWAR",
  "FARIDABAD",
  "GHAZIABAD",
  "DISAWAR",
  "GALI",
  "SHREEGANESH",
  "DELHIBAZAR",
  "NEWFARIDABAD",
  "PATNA",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const pad = (n) => String(n).padStart(2, "0");
const ord = (d) =>
  d % 10 === 1 && d % 100 !== 11 ? "st" :
  d % 10 === 2 && d % 100 !== 12 ? "nd" :
  d % 10 === 3 && d % 100 !== 13 ? "rd" : "th";

const normalizeId = (x) => String(x || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayLabel(d) {
  return `${DAYS[d.getDay()]}. ${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}
function longDate(d) {
  return `${d.getDate()}${ord(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ResultHistoryScreen() {
  const navigation = useNavigation();

  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const monthDays = useMemo(() => {
    const arr = [];
    const cur = new Date(startOfMonth);
    while (cur <= today) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [today.getFullYear(), today.getMonth(), today.getDate()]);

  // --------------------- State ---------------------
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [games, setGames] = useState(DEFAULT_GAMES);

  // maps for fast lookup: results[YYYY-MM-DD][GAMEID] = "45"
  const [resultsByDate, setResultsByDate] = useState({});

  async function fetchResults() {
    try {
      setLoading(true);
      const from = ymd(startOfMonth);
      const to   = ymd(today);

      let list = null;

      // helper: extract array from axios response (handles {data:[]} and {data:{data:[]}})
      const extract = (r) => {
        const d = r?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.rows)) return d.rows;
        if (Array.isArray(d?.results)) return d.results;
        if (Array.isArray(r)) return r;
        return null;
      };

      try {
        const r = await API.resultsRange(from, to);
        list = extract(r);
      } catch (_) {}

      if (!list || list.length === 0) {
        try {
          const r2 = await API.resultsLatest(500);
          list = extract(r2);
        } catch (_) {}
      }

      if (!list) {
        setResultsByDate({});
        return;
      }

      const map = {};
      for (const row of list) {
        const date = String(row.dateKey || row.date || row.day || row.d || "").slice(0, 10);
        if (!date) continue;
        const gid = normalizeId(row.gameId || row.gameName || row.game || row.market || row.name);
        if (!gid) continue;

        const raw =
          row.result ?? row.value ?? row.num ?? row.number ?? row.winner ?? row.score ?? row.res;
        const val = (raw === 0 ? "00" : String(raw ?? "XX")).toUpperCase();

        if (!map[date]) map[date] = {};
        map[date][gid] = val;
      }
      setResultsByDate(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    API.games().then((r) => {
      const list = r?.data?.games || r?.data?.data || r?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const names = list.map((g) => normalizeId(g.name || g.slug || g.gameId || "")).filter(Boolean);
        if (names.length > 0) setGames(names);
      }
    }).catch(() => {});
    fetchResults();
  }, []);
  useAutoRefresh(fetchResults, { intervalMs: 15000 });

  const onRefresh = async () => {
    try { setRefreshing(true); await fetchResults(); }
    finally { setRefreshing(false); }
  };

  // --------------------- Build UI rows from state ---------------------
  const last2 = useMemo(() => {
    const mkRow = () => games.reduce((acc, g) => ((acc[g] = "XX"), acc), {});
    const d1 = ymd(yesterday);
    const d2 = ymd(today);
    const row1 = mkRow();
    const row2 = mkRow();
    if (resultsByDate[d1]) {
      for (const g of games) {
        const v = resultsByDate[d1][g];
        if (v) row1[g] = v;
      }
    }
    if (resultsByDate[d2]) {
      for (const g of games) {
        const v = resultsByDate[d2][g];
        if (v) row2[g] = v;
      }
    }
    return { [dayLabel(yesterday)]: row1, [dayLabel(today)]: row2 };
  }, [resultsByDate, games, today.getTime()]);

  const monthRows = useMemo(() => {
    return monthDays.map((d) => {
      const dateKey = ymd(d);
      const base = games.reduce((acc, g) => ((acc[g] = "XX"), acc), {});
      if (resultsByDate[dateKey]) {
        for (const g of games) {
          const v = resultsByDate[dateKey][g];
          if (v) base[g] = v;
        }
      }
      return { date: pad(d.getDate()), results: base };
    });
  }, [monthDays, resultsByDate, games]);

  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate?.("MainTabs", { screen: "Home" });
  };

  const topNote = `Daily Superfast Satta King Result of ${longDate(today)} — Gali, Disawar, Ghaziabad, Faridabad`;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.wrap}>
        {/* ✅ centered header container */}
        <View style={s.headerOuter}>
          <View style={s.container}>
            <View style={s.header}>
              <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={s.headerTitle} numberOfLines={1}>Result History</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Logo */}
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ✅ centered main content */}
          <View style={s.container}>
            <Text style={s.topNote}>{topNote}</Text>

            {/* ===== Last 2 Days ===== */}
            <View style={s.sectionCard}>
              <View style={s.sectionHead}>
                <Text style={s.sectionHeadTxt} numberOfLines={2}>
                  2 Day Game Results
                </Text>
              </View>

              {/* ✅ small screens: make sure table doesn't break */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.simpleTableInner}>
                  <View style={[s.tr, s.thRow]}>
                    <Text style={[s.th, s.colGame]} numberOfLines={1}>Game</Text>
                    <Text style={[s.th, s.colDay]} numberOfLines={1}>{dayLabel(yesterday)}</Text>
                    <Text style={[s.th, s.colDay]} numberOfLines={1}>{dayLabel(today)}</Text>
                  </View>

                  {games.map((g) => {
                    const hi = g === "GALI" || g === "FARIDABAD";
                    return (
                      <View key={g} style={[s.tr, hi && s.hiRow]}>
                        <Text style={[s.td, s.colGame]} numberOfLines={1}>{g}</Text>
                        <Text style={[s.td, s.colDay]} numberOfLines={1}>{last2[dayLabel(yesterday)]?.[g] ?? "XX"}</Text>
                        <Text style={[s.td, s.colDay]} numberOfLines={1}>{last2[dayLabel(today)]?.[g] ?? "XX"}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* ===== Monthly Table ===== */}
            <View style={s.sectionCard}>
              <View style={s.sectionHead}>
                <Text style={s.sectionHeadTxt} numberOfLines={3}>
                  Monthly Satta King Result Chart of {MONTHS[today.getMonth()]} {today.getFullYear()} for Gali, Disawar,
                  Ghaziabad and Faridabad
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.bigTable}>
                  <View style={[s.tr, s.thRow]}>
                    <Text style={[s.th, s.colDate]} numberOfLines={1}>DATE</Text>
                    {games.map((g) => (
                      <Text key={g} style={[s.th, s.colGameWide]} numberOfLines={1}>{g}</Text>
                    ))}
                  </View>

                  {monthRows.map((r) => (
                    <View key={r.date} style={s.tr}>
                      <Text style={[s.td, s.colDate]} numberOfLines={1}>{r.date}</Text>
                      {games.map((g) => (
                        <Text key={g} style={[s.td, s.colGameWide]} numberOfLines={1}>
                          {r.results[g] ?? "XX"}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {loading && (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },
  wrap: { flex: 1, backgroundColor: APP_BG },

  // ✅ stable width for all content (prevents full stretch)
  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 10,
  },

  headerOuter: { backgroundColor: APP_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 4,
    backgroundColor: APP_BG,
  },
  backBtn: { padding: 6, marginRight: 6 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  logo: { width: 72, height: 72, alignSelf: "center", marginVertical: 8 },

  scrollContent: { paddingBottom: 24 },

  topNote: {
    textAlign: "center",
    color: "#111827",
    marginTop: 2,
    marginBottom: 6,
    fontSize: 12,
  },

  sectionCard: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
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
  sectionHead: {
    backgroundColor: "#0fb79e",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  sectionHeadTxt: { color: "#fff", fontWeight: "800", textAlign: "center" },

  // ✅ inside horizontal scroll for 2-day table
  simpleTableInner: {
    margin: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    minWidth: 520, // ✅ prevents squish on tiny screens
  },

  bigTable: {
    margin: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },

  tr: { flexDirection: "row", alignItems: "center" },
  thRow: { backgroundColor: "#0fb79e" },

  th: {
    color: "#fff",
    fontWeight: "800",
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  td: {
    color: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  hiRow: { backgroundColor: "#fff8cc" },

  colGame: { width: 170 }, // ✅ fixed column widths for horizontal scroll stability
  colDay: { width: 170, textAlign: "center" },

  colDate: { width: 72, textAlign: "center" },
  colGameWide: { width: 140, textAlign: "center" },
});
