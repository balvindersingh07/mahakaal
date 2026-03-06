// src/screens/play/GamePlay.js
import React, { useEffect, useMemo, useState, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { THEME } from "../../theme";
import { useBetCart } from "../../context/BetCartContext";
import BetCartBar from "../../components/BetCartBar";

const NUMBERS = [
  ...Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0")),
  "00",
];
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const PRESETS = [10, 20, 50, 100];

/* ---------------- time helpers ---------------- */
const toMinutes = (t) => {
  if (!t) return null;
  const s = String(t).trim();

  // "07:00 AM" / "7:00 pm"
  const ampm = /\b(am|pm)\b/i.test(s);
  if (ampm) {
    const [time, mer] = s.split(/\s+/);
    let [h, m] = (time || "0:0").split(":").map((x) => Number(x || 0));
    const am = (mer || "").toUpperCase() === "AM";
    if (am) {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return h * 60 + m;
  }

  // "07:00"
  const [hRaw, mRaw = "0"] = s.split(":");
  const h = Math.min(23, Math.max(0, Number(hRaw) || 0));
  const m = Math.min(59, Math.max(0, Number(mRaw) || 0));
  return h * 60 + m;
};

const fmtDur = (mins) => {
  let m = Math.max(0, mins | 0);
  const d = Math.floor(m / 1440);
  m %= 1440;
  const h = Math.floor(m / 60);
  m %= 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
};

const statusInfo = (nowMin, sMin, eMin) => {
  // if timings missing → allow play (backend will validate if it wants)
  if (sMin == null || eMin == null) return { status: "open", mins: 0 };

  const crosses = eMin <= sMin; // close after midnight
  const endAbs = crosses ? eMin + 1440 : eMin;
  const nowAbs = crosses && nowMin < sMin ? nowMin + 1440 : nowMin;

  if (nowAbs < sMin) return { status: "upcoming", mins: sMin - nowAbs };
  if (nowAbs <= endAbs) return { status: "open", mins: endAbs - nowAbs };
  return { status: "closed", mins: sMin + 1440 - nowAbs };
};

/* ---------------- utils ---------------- */
const onlyDigits = (s) => (String(s || "").match(/\d+/g) || []).join("");

export default function GamePlay() {
  const navigation = useNavigation();
  const route = useRoute();

  const p = route?.params || {};
  const title = String(
    p?.title || p?.name || p?.gameName || p?.game || p?.gameId || "PLAY"
  );

  // ✅ keep raw slug/id exactly as received (DO NOT uppercase/modify)
  const gameIdParam = String(p?.gameId || p?.slug || p?.id || p?._id || "") || "";

  const start = p?.start || p?.openTime || "";
  const end = p?.end || p?.closeTime || "";

  const { setGame, setItemsForType, items: cartItems, clearCart } = useBetCart();

  const [bets, setBets] = useState({});
  const [activeKey, setActiveKey] = useState(null);
  const [amount, setAmount] = useState("");

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setGame({ gameId: gameIdParam, gameName: title, start, end });
  }, [gameIdParam, title, start, end, setGame]);

  useEffect(() => {
    const jantri = cartItems.filter((i) => i.betType === "jantri");
    const b = {};
    for (const it of jantri) {
      const k = `${it.subType || "num"}:${it.key}`;
      b[k] = it.amount;
    }
    setBets((prev) => {
      const same = Object.keys(prev).length === Object.keys(b).length &&
        Object.keys(prev).every((k) => prev[k] === b[k]);
      return same ? prev : b;
    });
  }, [cartItems]);

  const syncBetsToCart = useCallback((nextBets) => {
    const cartItems = Object.entries(nextBets)
      .filter(([, amt]) => Number(amt) >= 1)
      .map(([k, amt]) => {
        const [typeRaw, keyRaw] = String(k).split(":");
        const subType = String(typeRaw || "num").trim().toLowerCase();
        const key = String(keyRaw || "").trim();
        const id = `jantri:${subType}:${key}`;
        return { id, betType: "jantri", subType, key, num: key, amount: Number(amt) };
      });
    setItemsForType("jantri", cartItems);
  }, [setItemsForType]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sMin = toMinutes(start);
  const eMin = toMinutes(end);
  const info = statusInfo(nowMin, sMin, eMin);
  const isOpen = info.status === "open";

  const openAmount = (key) => {
    if (start && end && !isOpen) {
      Alert.alert(
        title,
        info.status === "upcoming" ? "Game has not started yet." : "Game is closed."
      );
      return;
    }
    setActiveKey(key);
    setAmount(String(bets[key] ?? ""));
  };

  const saveAmount = () => {
    const n = Math.max(0, parseInt(onlyDigits(amount) || "0", 10));
    setBets((b) => {
      const next = { ...b };
      if (n >= 1) next[activeKey] = n;
      else delete next[activeKey];
      syncBetsToCart(next);
      return next;
    });
    setActiveKey(null);
    setAmount("");
  };

  const clearKey = () => {
    setBets((b) => {
      const nx = { ...b };
      delete nx[activeKey];
      syncBetsToCart(nx);
      return nx;
    });
    setActiveKey(null);
    setAmount("");
  };

  const clearAll = () => {
    clearCart();
    setBets({});
  };

  const Cell = memo(function Cell({ label, k }) {
    const val = bets[k];
    const selected = !!val;
    return (
      <TouchableOpacity
        style={[styles.cell, selected && styles.cellOn]}
        onPress={() => openAmount(k)}
        onLongPress={() => {
          if (bets[k]) {
            setBets((b) => {
              const nx = { ...b };
              delete nx[k];
              return nx;
            });
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.cellLabel}>{label}</Text>
        <Text style={[styles.cellAmt, selected && styles.cellAmtOn]} numberOfLines={1}>
          {selected ? `₹${val}` : ""}
        </Text>
      </TouchableOpacity>
    );
  });

  const metaText =
    info.status === "open"
      ? `Closes in ${fmtDur(info.mins)}`
      : info.status === "upcoming"
      ? `Opens in ${fmtDur(info.mins)}`
      : "Closed";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 34 }} />

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
            {start && end ? (
              <Text
                style={[
                  styles.meta,
                  info.status === "open"
                    ? styles.metaOpen
                    : info.status === "upcoming"
                    ? styles.metaUpcoming
                    : styles.metaClosed,
                ]}
                numberOfLines={1}
              >
                {metaText} • {start} — {end}
              </Text>
            ) : null}
          </View>

          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusDot,
                info.status === "open"
                  ? styles.dotGreen
                  : info.status === "upcoming"
                  ? styles.dotGrey
                  : styles.dotRed,
              ]}
            />
          </View>
        </View>

        {/* Quick actions (horizontal scroll for small screens) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip label="JANTRI" onPress={() => {}} />
          <Chip
            label="CROSSING"
            onPress={() => navigation.navigate("Crossing", { title, gameId: gameIdParam, start, end })}
          />
          <Chip
            label="NO TO NO"
            onPress={() => navigation.navigate("NoToNo", { title, gameId: gameIdParam, start, end })}
          />
          <TouchableOpacity
            onPress={clearAll}
            style={[styles.chip, { backgroundColor: THEME.textMuted }]}
            activeOpacity={0.85}
          >
            <Text style={styles.chipText} numberOfLines={1}>CLEAR ALL</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Body */}
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ centered container so on wide screens it doesn't look full-stretch */}
          <View style={styles.container}>
            <View style={styles.grid}>
              {NUMBERS.map((n) => (
                <Cell key={n} label={n} k={`num:${n}`} />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Andar Haruf</Text>
            <View style={styles.gridRow10}>
              {DIGITS.map((d) => (
                <Cell key={`a-${d}`} label={d} k={`andar:${d}`} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Bahar Haruf</Text>
            <View style={styles.gridRow10}>
              {DIGITS.map((d) => (
                <Cell key={`b-${d}`} label={d} k={`bahar:${d}`} />
              ))}
            </View>

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        <BetCartBar
          isGameOpen={isOpen}
          onSuccess={() => setBets({})}
          gameId={gameIdParam}
          gameName={title}
        />

        {/* Amount modal */}
        <Modal
          visible={!!activeKey}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveKey(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Enter Amount</Text>

              <View style={styles.presetRow}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.preset}
                    onPress={() => setAmount(String(p))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.presetTxt}>₹{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(onlyDigits(t))}
                placeholder="0"
                keyboardType="number-pad"
                style={styles.input}
              />

              <View style={styles.modalRow}>
                <TouchableOpacity style={[styles.mBtn, styles.mDanger]} onPress={clearKey}>
                  <Text style={styles.mText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mBtn, styles.mPrimary]} onPress={saveAmount}>
                  <Text style={styles.mText}>Save</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setActiveKey(null)} style={styles.modalCloseHit}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  wrap: { flex: 1, backgroundColor: THEME.bg },

  header: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.textDark },
  meta: { fontSize: 12, marginTop: 2 },
  metaOpen: { color: THEME.primary },
  metaUpcoming: { color: THEME.textMuted },
  metaClosed: { color: THEME.danger },
  statusWrap: { width: 28, alignItems: "center" },
  statusDot: { width: 12, height: 12, borderRadius: 999 },
  dotGreen: { backgroundColor: THEME.primary },
  dotGrey: { backgroundColor: THEME.textMuted },
  dotRed: { backgroundColor: THEME.danger },

  // ✅ chips scroll
  chips: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  chip: {
    backgroundColor: THEME.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
    elevation: 1,
  },
  chipText: { color: "#fff", fontWeight: "700" },

  // ✅ bottom bar safe
  body: { paddingTop: 6, paddingBottom: 140 },

  // ✅ centered container
  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },

  cell: {
    width: "10%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 56, // ✅ prevents giant cells on wide screens
  },
  cellOn: { backgroundColor: "#ede9fe", borderColor: THEME.purple },
  cellLabel: { fontSize: 12, color: THEME.textDark, fontWeight: "700" },
  cellAmt: { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  cellAmtOn: { color: THEME.textDark, fontWeight: "700" },

  sectionTitle: { marginTop: 18, marginBottom: 8, fontWeight: "700", color: THEME.textDark },
  gridRow10: { flexDirection: "row", flexWrap: "wrap" },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: THEME.card, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10, color: THEME.textDark },
  presetRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  preset: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#ede9fe",
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  presetTxt: { color: THEME.primary, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalRow: { flexDirection: "row", justifyContent: "space-between" },
  mBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  mPrimary: { backgroundColor: THEME.primary },
  mDanger: { backgroundColor: THEME.danger },
  mText: { color: "#fff", fontWeight: "800" },
  modalCloseHit: { alignSelf: "center", marginTop: 8, padding: 6 },
  modalClose: { color: THEME.textMuted, fontWeight: "600" },
});
