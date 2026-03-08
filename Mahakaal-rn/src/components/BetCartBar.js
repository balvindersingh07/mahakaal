// src/components/BetCartBar.js
// Shared bottom bar: cart summary, balance, optional item list, Play button
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { THEME } from "../theme";
import { API } from "../api";
import { useBetCart } from "../context/BetCartContext";
import { useWallet } from "../context/WalletContext";

const toMinutes = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  const ampm = /\b(am|pm)\b/i.test(s);
  if (ampm) {
    const [time, mer] = s.split(/\s+/);
    let [h, m] = (time || "0:0").split(":").map((x) => Number(x || 0));
    if ((mer || "").toUpperCase() === "AM") { if (h === 12) h = 0; }
    else { if (h !== 12) h += 12; }
    return h * 60 + m;
  }
  const [hRaw, mRaw = "0"] = s.split(":");
  return Math.min(23, Math.max(0, Number(hRaw) || 0)) * 60 + Math.min(59, Math.max(0, Number(mRaw || 0)));
};
const computeIsOpen = (start, end) => {
  if (!start || !end) return true;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sMin = toMinutes(start);
  const eMin = toMinutes(end);
  if (sMin == null || eMin == null) return true;
  const crosses = eMin <= sMin;
  const endAbs = crosses ? eMin + 1440 : eMin;
  const nowAbs = crosses && nowMin < sMin ? nowMin + 1440 : nowMin;
  return nowAbs >= sMin && nowAbs <= endAbs;
};

const slugGameId = (val) =>
  String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function BetCartBar({
  isGameOpen: isOpenProp,
  onSuccess,
  gameId: gameIdProp,
  gameName: gameNameProp,
}) {
  const {
    items,
    total,
    count,
    gameId: gameIdCtx,
    gameName: gameNameCtx,
    start,
    end,
    clearCart,
    removeItem,
  } = useBetCart();

  const { balance, setBalance, refreshBalance } = useWallet();

  const gameId = gameIdProp || gameIdCtx || "";
  const gameName = gameNameProp || gameNameCtx || "Game";
  const isGameOpen = isOpenProp ?? computeIsOpen(start, end);

  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePlay = async () => {
    if (!items.length) return;
    if (!isGameOpen) {
      Alert.alert(gameName || "Game", "Game is not open right now.");
      return;
    }

    try {
      setSubmitting(true);

      // Group by betType (backend expects one type per request)
      const byType = {};
      for (const it of items) {
        const t = it.betType || "jantri";
        if (!byType[t]) byType[t] = [];
        byType[t].push(it);
      }

      const results = [];
      const gid = slugGameId(gameId) || slugGameId(gameName) || slugGameId(gameNameCtx);

      if (!gid) {
        Alert.alert("Error", "Game not selected. Please go back and select a game.");
        return;
      }

      for (const [betType, list] of Object.entries(byType)) {
        const apiItems = list.map((i) => {
          const amt = Number(i.amount) || 0;
          if (betType === "jantri") {
            return { type: i.subType || "num", key: i.key || i.num, num: i.num, amount: amt };
          }
          if (betType === "crossing") {
            return { type: "crossing", key: i.num, num: i.num, amount: amt };
          }
          if (betType === "no_to_no") {
            return { type: "no-to-no", key: i.num, num: i.num, amount: amt };
          }
          return { type: betType, key: i.key || i.num, num: i.num, amount: amt };
        });

        const payload = {
          gameId: gid,
          gameName: gameName || "Game",
          betType: betType === "no_to_no" ? "no_to_no" : betType,
          items: apiItems,
          total: apiItems.reduce((s, x) => s + (x.amount || 0), 0),
        };
        if (betType === "jantri") payload.type = "jantri";
        if (betType === "no_to_no") payload.type = "no_to_no";

        const res = await API.placeBet(payload);
        const data = res?.data ?? res;
        const slipId = data?.slipId || data?.id || data?.bet?._id || "OK";
        results.push({ betType, slipId, count: apiItems.length, total: payload.total });

        // ✅ Update balance instantly from API response (wallet deducted on backend)
        const newWallet = data?.wallet;
        if (Number.isFinite(newWallet)) {
          setBalance(newWallet);
        } else {
          refreshBalance();
        }
      }

      clearCart();
      setExpanded(false);
      onSuccess?.();

      const msg = results
        .map((r) => `${r.betType}: Slip ${r.slipId} (${r.count} items, ₹${r.total})`)
        .join("\n");
      Alert.alert("Bet Placed", `Total: ₹${total}\n\n${msg}`);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg =
        data?.error ||
        data?.message ||
        e?.message ||
        (status === 401 ? "Please login again." : "Bet failed.");
      const detail = status ? ` (${status})` : "";
      console.warn("[BetCartBar] placeBet error:", status, data, e?.message);
      Alert.alert("Bet Failed", msg + detail);
    } finally {
      setSubmitting(false);
    }
  };

  const displayLabel = (it) => {
    if (it.betType === "jantri") {
      const t = it.subType || it.type || "num";
      return t === "num" ? it.num : `${t} ${it.num}`;
    }
    return it.num;
  };

  const balanceStr = `₹${Number(balance || 0).toFixed(2)}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.summary}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.8}
        >
          <Text style={styles.total}>
            ₹ {total.toLocaleString("en-IN")} / {count}
          </Text>
          <Text style={[styles.balanceText, { color: THEME.primary }]}>
            Balance: {balanceStr}
          </Text>
          <Text style={styles.hint}>
            {expanded ? "Tap to collapse" : "Tap to view cart"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.playBtn,
            (count === 0 || !isGameOpen || submitting) && styles.playBtnDisabled,
          ]}
          activeOpacity={0.9}
          disabled={count === 0 || !isGameOpen || submitting}
          onPress={handlePlay}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.playText}>PLAY</Text>
          )}
        </TouchableOpacity>
      </View>

      {expanded && items.length > 0 && (
        <View style={styles.listWrap}>
          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {items.map((it) => (
              <View key={it.id} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {displayLabel(it)} ({it.betType})
                </Text>
                <Text style={styles.rowAmt}>₹{it.amount}</Text>
                <Pressable
                  style={styles.delBtn}
                  onPress={() => removeItem(it.id)}
                  hitSlop={8}
                >
                  <Text style={styles.delText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summary: { flex: 1 },
  total: { fontSize: 18, fontWeight: "800", color: THEME.textDark },
  balanceText: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  hint: { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  playBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    elevation: 1,
  },
  playBtnDisabled: { backgroundColor: THEME.textMuted, opacity: 0.8 },
  playText: { color: "#fff", fontWeight: "900", letterSpacing: 0.6 },
  listWrap: { maxHeight: 140, paddingHorizontal: 16, paddingBottom: 8 },
  list: { maxHeight: 130 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  rowLabel: { flex: 1, fontSize: 14, color: THEME.textDark, fontWeight: "600" },
  rowAmt: { fontSize: 14, fontWeight: "700", color: THEME.primary, marginRight: 12 },
  delBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  delText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
