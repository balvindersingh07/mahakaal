// src/screens/play/NoToNo.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { THEME } from "../../theme";
import { useBetCart } from "../../context/BetCartContext";
import BetCartBar from "../../components/BetCartBar";

const pad2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "00";
  return x < 10 ? `0${x}` : String(x);
};

// ✅ backend-friendly slug: old_disawar / delhi_bazar etc.
const slugGameId = (val) =>
  String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function NoToNo() {
  const navigation = useNavigation();
  const route = useRoute();

  const title = route?.params?.title || route?.params?.game || "GAME";
  const pass = route?.params || {};
  const rawGameId = route?.params?.gameId || title;
  const gameId = slugGameId(rawGameId);
  const start = pass?.start || "";
  const end = pass?.end || "";

  const { setGame, setItemsForType, clearCart, items: cartItems } = useBetCart();

  const [fromNo, setFromNo] = useState("");
  const [toNo, setToNo] = useState("");
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState([]); // [{num, amt}]

  useEffect(() => {
    setGame({ gameId, gameName: title, start, end });
  }, [gameId, title, start, end, setGame]);

  useEffect(() => {
    const noToNo = cartItems.filter((i) => i.betType === "no_to_no");
    const arr = noToNo.map((it) => ({ num: it.num, amt: it.amount }));
    arr.sort((a, b) => Number(a.num) - Number(b.num));
    setItems((prev) => {
      const same = prev.length === arr.length && prev.every((p, i) => p.num === arr[i]?.num && p.amt === arr[i]?.amt);
      return same ? prev : arr;
    });
  }, [cartItems]);

  const syncItemsToCart = useCallback((nextItems) => {
    const cartItems = nextItems.map((i) => ({
      id: `no_to_no:${i.num}`,
      betType: "no_to_no",
      key: i.num,
      num: i.num,
      amount: Number(i.amt) || 0,
    }));
    setItemsForType("no_to_no", cartItems);
  }, [setItemsForType]);

  const addRange = () => {
    const a = Number(fromNo),
      b = Number(toNo),
      amt = Number(amount);

    if ([a, b, amt].some((v) => !Number.isFinite(v))) {
      return Alert.alert("Invalid", "Enter valid numbers.");
    }
    if (a < 0 || a > 99 || b < 0 || b > 99 || a > b) {
      return Alert.alert("Invalid", "Range 00–99, From ≤ To.");
    }
    if (amt <= 0) return Alert.alert("Invalid", "Amount > 0.");

    setItems((prev) => {
      const map = new Map(prev.map((it) => [it.num, it]));
      for (let n = a; n <= b; n++) map.set(pad2(n), { num: pad2(n), amt });
      const next = Array.from(map.values()).sort(
        (x, y) => Number(x.num) - Number(y.num)
      );
      syncItemsToCart(next);
      return next;
    });
  };

  const removeOne = (num) => {
    setItems((p) => {
      const next = p.filter((i) => i.num !== num);
      syncItemsToCart(next);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kb}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.wrap}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ✅ centered container (prevents full stretch on tablet/web) */}
            <View style={styles.container}>
              <Text style={styles.title} numberOfLines={1}>
                {String(title).toUpperCase()}
              </Text>

              {/* Tabs (horizontal scroll so no overflow) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
              >
                <Tag
                  text="JANTRI"
                  onPress={() => navigation.navigate("GamePlay", pass)}
                />
                <Tag
                  text="CROSSING"
                  onPress={() => navigation.navigate("Crossing", pass)}
                />
                <Tag text="NO TO NO" active />
                <Tag text="CLEAR ALL" gray onPress={() => { clearCart(); setItems([]); }} />
              </ScrollView>

              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>First Number</Text>
                    <TextInput
                      value={fromNo}
                      onChangeText={(t) =>
                        setFromNo(t.replace(/[^0-9]/g, "").slice(0, 2))
                      }
                      keyboardType="number-pad"
                      placeholder="00"
                      placeholderTextColor={THEME.textMuted}
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.toCol}>
                    <Text style={styles.toText}>To</Text>
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.label}>Second Number</Text>
                    <TextInput
                      value={toNo}
                      onChangeText={(t) =>
                        setToNo(t.replace(/[^0-9]/g, "").slice(0, 2))
                      }
                      keyboardType="number-pad"
                      placeholder="99"
                      placeholderTextColor={THEME.textMuted}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={[styles.row, { alignItems: "flex-end" }]}>
                  <View style={[styles.col, { flex: 1 }]}>
                    <Text style={styles.label}>Enter Amount</Text>
                    <TextInput
                      value={amount}
                      onChangeText={(t) =>
                        setAmount(t.replace(/[^0-9]/g, "").slice(0, 5))
                      }
                      keyboardType="number-pad"
                      placeholder="20"
                      placeholderTextColor={THEME.textMuted}
                      style={styles.input}
                    />
                  </View>

                  <Pressable style={styles.addBtn} onPress={addRange}>
                    <Text style={styles.addText}>+ ADD</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.table}>
                <View style={[styles.trow, styles.thead]}>
                  <Text
                    style={[styles.tcell, styles.theadText, { flex: 0.8 }]}
                    numberOfLines={1}
                  >
                    Number
                  </Text>
                  <Text
                    style={[styles.tcell, styles.theadText, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    Amount
                  </Text>
                  <Text
                    style={[
                      styles.tcell,
                      styles.theadText,
                      { flex: 0.9, textAlign: "right" },
                    ]}
                    numberOfLines={1}
                  >
                    Delete
                  </Text>
                </View>

                {items.map((i, idx) => (
                  <View
                    key={i.num}
                    style={[
                      styles.trow,
                      { backgroundColor: idx % 2 ? THEME.bg : THEME.card },
                    ]}
                  >
                    <Text style={[styles.tcell, { flex: 0.8 }]} numberOfLines={1}>
                      {i.num}
                    </Text>
                    <Text style={[styles.tcell, { flex: 1 }]} numberOfLines={1}>
                      ₹{i.amt}
                    </Text>
                    <View
                      style={[
                        styles.tcell,
                        { flex: 0.9, alignItems: "flex-end" },
                      ]}
                    >
                      <Pressable
                        style={styles.delBtn}
                        onPress={() => removeOne(i.num)}
                      >
                        <Text style={styles.delText} numberOfLines={1}>
                          DELETE
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}

                {!items.length && (
                  <View style={[styles.trow, { backgroundColor: THEME.card }]}>
                    <Text style={[styles.tcell, { textAlign: "center", color: THEME.textMuted }]}>
                      No items
                    </Text>
                  </View>
                )}
              </View>

              {/* space so fixed bottom bar doesn't overlap */}
              <View style={{ height: 16 }} />
            </View>
          </ScrollView>

          <BetCartBar
            onSuccess={() => {
              setItems([]);
              setFromNo("");
              setToNo("");
              setAmount("");
            }}
            gameId={rawGameId}
            gameName={title}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tag({ text, active, gray, onPress }) {
  const bg = active ? THEME.primary : gray ? THEME.textMuted : THEME.primary;
  return (
    <Pressable onPress={onPress} style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={styles.tagText} numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  kb: { flex: 1 },
  wrap: { flex: 1, backgroundColor: THEME.bg },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140, // ✅ room for bottom bar
  },

  // ✅ stable width on wide screens
  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },

  title: { fontSize: 20, fontWeight: "900", color: THEME.textDark, marginBottom: 8 },

  tabs: { gap: 10, marginBottom: 8, alignItems: "center" },
  tag: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  tagText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    gap: 10,
  },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  label: { fontWeight: "700", color: THEME.textDark, marginBottom: 6 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
  },

  toCol: { justifyContent: "flex-end", paddingBottom: 2 },
  toText: { color: THEME.textMuted, marginBottom: 8 },

  addBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "#fff", fontWeight: "900" },

  table: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  trow: {
    flexDirection: "row",
    minHeight: 48,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  thead: { backgroundColor: THEME.primary },
  theadText: { color: "#fff", fontWeight: "800" },
  tcell: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, color: THEME.textDark },

  delBtn: {
    backgroundColor: THEME.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  delText: { color: "#fff", fontWeight: "800" },
});
