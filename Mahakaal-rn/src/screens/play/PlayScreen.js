import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { API } from "../../api";

import { THEME } from "../../theme";
const APP_BG = THEME.bg;

/* ---------------- fallback ---------------- */
const GAMES_FALLBACK = [
  { id: "old-disawar", name: "OLD DISAWAR", openTime: "7:00 AM", closeTime: "1:20 AM", active: true },
  { id: "faridabad", name: "FARIDABAD", openTime: "7:00 AM", closeTime: "5:35 PM", active: true },
  { id: "disawar", name: "DISAWAR", openTime: "7:00 AM", closeTime: "2:10 AM", active: true },
  { id: "ghaziabad", name: "GHAZIABAD", openTime: "7:00 AM", closeTime: "8:45 PM", active: true },
  { id: "gali", name: "GALI", openTime: "7:00 AM", closeTime: "10:45 PM", active: true },
  { id: "shree-ganesh", name: "SHREE GANESH", openTime: "7:00 AM", closeTime: "4:05 PM", active: true },
  { id: "delhi-bazar", name: "DELHI BAZAR", openTime: "7:00 AM", closeTime: "2:35 PM", active: true },
  { id: "patna", name: "PATNA", openTime: "7:00 AM", closeTime: "4:30 PM", active: true },
  { id: "new-faridabad", name: "NEW FARIDABAD", openTime: "7:00 AM", closeTime: "6:15 PM", active: true },
];

/* ---------------- time helpers ---------------- */
// supports "7:00 AM", "07:00", "7:00"
const toMinutes = (t) => {
  if (!t) return null;
  const s = String(t).trim();

  if (/\b(am|pm)\b/i.test(s)) {
    const [time, mer] = s.split(/\s+/);
    let [h, m] = time.split(":").map((x) => Number(x || 0));
    const isAM = String(mer || "").toUpperCase() === "AM";
    if (isAM && h === 12) h = 0;
    if (!isAM && h !== 12) h += 12;
    return h * 60 + (m || 0);
  }

  const [hRaw, mRaw = "0"] = s.split(":");
  const h = Math.min(23, Math.max(0, Number(hRaw) || 0));
  const m = Math.min(59, Math.max(0, Number(mRaw) || 0));
  return h * 60 + m;
};

const to12h = (mins) => {
  if (mins == null) return "";
  let m = mins % 1440;
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const mer = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")} ${mer}`;
};

const fmtDur = (mins) => {
  let m = Math.max(0, mins | 0);
  const h = Math.floor(m / 60);
  m %= 60;
  return `${h ? `${h}h ` : ""}${m}m`;
};

// ✅ handles overnight games
const getStatusInfo = (nowMin, startMin, endMin) => {
  if (startMin == null || endMin == null) return { status: "open", mins: 0 };

  const crosses = endMin <= startMin;
  const endAbs = crosses ? endMin + 1440 : endMin;
  const nowAbs = crosses && nowMin < startMin ? nowMin + 1440 : nowMin;

  if (nowAbs < startMin) return { status: "upcoming", mins: startMin - nowAbs };
  if (nowAbs <= endAbs) return { status: "open", mins: endAbs - nowAbs };
  return { status: "closed", mins: startMin + 1440 - nowAbs };
};

/* ---------------- mapping helpers ---------------- */
const normalizeGames = (arr) => {
  const input = Array.isArray(arr) && arr.length ? arr : GAMES_FALLBACK;

  return input
    .map((g, idx) => {
      const rawId = g._id ?? g.id ?? g.slug ?? String(idx);
      const name = String(g.name ?? g.gameName ?? rawId).toUpperCase();

      const openTime = g.openTime ?? g.start ?? "07:00";
      const closeTime = g.closeTime ?? g.end ?? "23:59";

      const sMin = toMinutes(openTime);
      const eMin = toMinutes(closeTime);

      const displayStart = /\b(am|pm)\b/i.test(String(openTime))
        ? String(openTime)
        : to12h(sMin);

      const displayEnd = /\b(am|pm)\b/i.test(String(closeTime))
        ? String(closeTime)
        : to12h(eMin);

      return {
        id: String(rawId), // ✅ keep as-is
        _id: g._id ? String(g._id) : undefined,
        slug: g.slug ? String(g.slug) : undefined,

        name,

        // ✅ raw times (for navigation / backend compatibility)
        openTime: String(openTime),
        closeTime: String(closeTime),

        // ✅ display times (UI)
        displayStart,
        displayEnd,

        active: g.active !== false,
        order: Number(g.order ?? idx),
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

/* ---------------- component ---------------- */
export default function PlayScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 520);

  const [now, setNow] = useState(new Date());
  const nowMin = useMemo(() => now.getHours() * 60 + now.getMinutes(), [now]);

  const [games, setGames] = useState(normalizeGames(GAMES_FALLBACK));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchGames = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);

      const r = await API?.games?.();
      const payload = r?.data ?? r;

      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.games)
        ? payload.games
        : Array.isArray(payload)
        ? payload
        : [];

      const mapped = normalizeGames(list);
      setGames(mapped.length ? mapped : normalizeGames(GAMES_FALLBACK));
    } catch (e) {
      console.log("❌ games fetch error:", e?.message || e);
      setErr("Could not load game list");
      setGames(normalizeGames(GAMES_FALLBACK));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useFocusEffect(useCallback(() => { fetchGames(); }, [fetchGames]));
  useAutoRefresh(fetchGames, { intervalMs: 15000 });

  // ✅ IMPORTANT: DO NOT normalize gameId
  const goPlay = (game) => {
    if (!game) return;

    navigation.navigate("GamePlay", {
      // ✅ raw ids (as-is)
      gameId: String(game._id || game.id || game.slug || ""),
      id: String(game.id || ""),
      _id: game._id ? String(game._id) : undefined,
      slug: game.slug ? String(game.slug) : undefined,

      // ✅ names + times (raw)
      title: game.name,
      gameName: game.name,
      openTime: game.openTime,
      closeTime: game.closeTime,

      // ✅ keep old keys also
      start: game.openTime,
      end: game.closeTime,
    });
  };

  const renderItem = ({ item }) => {
    const sMin = toMinutes(item.openTime);
    const eMin = toMinutes(item.closeTime);
    const info = getStatusInfo(nowMin, sMin, eMin);

    const isOpen = info.status === "open";
    const isUpcoming = info.status === "upcoming";
    const canPlay = item.active && isOpen;

    const meta = isOpen
      ? `Closes in ${fmtDur(info.mins)}`
      : isUpcoming
      ? `Opens in ${fmtDur(info.mins)}`
      : "Closed";

    const label = canPlay ? "Play" : isUpcoming ? "Upcoming" : "Closed";
    const pillStyle = canPlay
      ? styles.pillGreen
      : isUpcoming
      ? styles.pillGrey
      : styles.pillRed;

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={THEME.textMuted} />
            <Text style={styles.timeText} numberOfLines={1}>
              {item.displayStart} — {item.displayEnd}
            </Text>
          </View>

          <Text
            style={[
              styles.meta,
              isOpen && styles.metaOpen,
              isUpcoming && styles.metaUpcoming,
              !isOpen && !isUpcoming && styles.metaClosed,
            ]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        </View>

        <TouchableOpacity
          disabled={!canPlay}
          onPress={() => canPlay && goPlay(item)}
          style={[styles.pill, pillStyle, !canPlay && styles.pillDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.pillText} numberOfLines={1}>
            {label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerOuter}>
        <View style={[styles.container, { maxWidth: maxW }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Games</Text>
            {loading && <ActivityIndicator />}
          </View>

          {err ? <Text style={styles.errText}>{err}</Text> : null}
        </View>
      </View>

      <FlatList
        contentContainerStyle={[styles.list, { maxWidth: maxW }]}
        data={games}
        keyExtractor={(g, i) => String(g._id || g.id || i)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={fetchGames}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },

  // header wrapper stays same bg but centered content inside
  headerOuter: { backgroundColor: APP_BG },

  container: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  header: {
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.textDark },
  errText: { color: "#dc2626", fontWeight: "600", marginBottom: 6 },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    width: "100%",
    alignSelf: "center",
  },

  card: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: THEME.card,
    borderRadius: 14,
    elevation: 2,
    alignItems: "center",
  },

  name: { fontSize: 16, fontWeight: "800", marginBottom: 6, color: THEME.textDark },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timeText: { marginLeft: 6, fontSize: 13, color: THEME.textMuted, flex: 1 },

  meta: { marginTop: 4, fontSize: 12, fontWeight: "600" },
  metaOpen: { color: THEME.primary },
  metaUpcoming: { color: THEME.textMuted },
  metaClosed: { color: THEME.danger },

  pill: {
    minWidth: 92,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  pillText: { color: "#fff", fontWeight: "700" },
  pillGreen: { backgroundColor: THEME.primary },
  pillRed: { backgroundColor: THEME.danger },
  pillGrey: { backgroundColor: THEME.textMuted },
  pillDisabled: { opacity: 0.9 },
});
