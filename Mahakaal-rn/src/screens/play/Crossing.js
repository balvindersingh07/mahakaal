// src/screens/play/Crossing.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { THEME } from "../../theme";
import { useBetCart } from "../../context/BetCartContext";
import BetCartBar from "../../components/BetCartBar";

function pad2(s = "") {
  const only = String(s).replace(/\D/g, "");
  return only.length >= 2 ? only.slice(-2) : only.padStart(2, "0");
}

export default function CrossingScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // ✅ accept both shapes
  const title = route.params?.title || route.params?.game || "GAME";
  const gameIdParam = route.params?.gameId || title;
  const start = route.params?.start || "";
  const end = route.params?.end || "";

  const { setGame, setItemsForType, clearCart, items: cartItems } = useBetCart();

  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [amt, setAmt] = useState("");

  const resetInputs = useCallback(() => {
    setFirst("");
    setSecond("");
    setAmt("");
  }, []);

  const [rows, setRows] = useState({}); // { "26": 500, ... }

  useEffect(() => {
    setGame({ gameId: gameIdParam, gameName: title, start, end });
  }, [gameIdParam, title, start, end, setGame]);

  useEffect(() => {
    const crossing = cartItems.filter((i) => i.betType === "crossing");
    const r = {};
    for (const it of crossing) r[it.num] = it.amount;
    setRows((prev) => {
      const same = Object.keys(prev).length === Object.keys(r).length &&
        Object.keys(prev).every((k) => prev[k] === r[k]);
      return same ? prev : r;
    });
  }, [cartItems]);

  const syncRowsToCart = useCallback((nextRows) => {
    const items = Object.entries(nextRows).map(([num, amount]) => ({
      id: `crossing:${num}`,
      betType: "crossing",
      key: num,
      num,
      amount: Number(amount) || 0,
    }));
    setItemsForType("crossing", items);
  }, [setItemsForType]);

  const list = useMemo(() => {
    return Object.keys(rows)
      .sort((a, b) => Number(a) - Number(b))
      .map((n) => ({ num: n, amount: rows[n] }));
  }, [rows]);

  const addSet = () => {
    const f = pad2(first);
    const s = pad2(second);
    const a = Number(amt);

    if (!/^\d{2}$/.test(f) || !/^\d{2}$/.test(s)) {
      Alert.alert(
        "Crossing",
        "Please enter both numbers in 2-digit format (00-99)."
      );
      return;
    }
    if (!a || a <= 0) {
      Alert.alert("Crossing", "Please enter a valid amount.");
      return;
    }

    const [f1, f2] = f.split("");
    const [s1, s2] = s.split("");
    const combos = [`${f1}${s1}`, `${f1}${s2}`, `${f2}${s1}`, `${f2}${s2}`];

    setRows((prev) => {
      const nx = { ...prev };
      combos.forEach((c) => (nx[c] = a));
      syncRowsToCart(nx);
      return nx;
    });
  };

  const delOne = (num) => {
    setRows((prev) => {
      const nx = { ...prev };
      delete nx[num];
      syncRowsToCart(nx);
      return nx;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kb}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.wrap}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 34 }} />

            <Text style={styles.headerTitle} numberOfLines={1}>
              {String(title).toUpperCase()}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Top chips (horizontal scroll so small screens don't cut) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="JANTRI"
              onPress={() =>
                navigation.navigate("GamePlay", route.params || { title })
              }
            />
            <Chip label="CROSSING" onPress={() => {}} />
            <Chip
              label="NO TO NO"
              onPress={() =>
                navigation.navigate("NoToNo", route.params || { title })
              }
            />
            <TouchableOpacity
              onPress={() => {
                clearCart();
                setRows({});
              }}
              style={[styles.chip, { backgroundColor: THEME.textMuted }]}
              activeOpacity={0.85}
            >
              <Text style={styles.chipText} numberOfLines={1}>CLEAR ALL</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.bodyContent}
          >
            {/* ✅ centered container to prevent full-stretch ugly on wide screens */}
            <View style={styles.container}>
              <View style={styles.labelsRow}>
                <Text style={[styles.lbl, styles.lblLeft]}>First Number</Text>
                <Text style={[styles.lbl, styles.lblRight]}>Second Number</Text>
              </View>

              <View style={styles.numRow}>
                <TextInput
                  value={first}
                  onChangeText={setFirst}
                  keyboardType="number-pad"
                  placeholder="00"
                  maxLength={2}
                  style={[styles.input, styles.numInput]}
                />
                <Text style={styles.crossMid}>×</Text>
                <TextInput
                  value={second}
                  onChangeText={setSecond}
                  keyboardType="number-pad"
                  placeholder="00"
                  maxLength={2}
                  style={[styles.input, styles.numInput]}
                />
              </View>

              <Text style={[styles.lbl, { marginTop: 10 }]}>Enter Amount</Text>
              <View style={styles.addRow}>
                <TextInput
                  value={amt}
                  onChangeText={setAmt}
                  keyboardType="number-pad"
                  placeholder="0"
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  activeOpacity={0.9}
                  onPress={addSet}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addTxt}>ADD</Text>
                </TouchableOpacity>
              </View>

              {/* Table */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 1.2 }]}>Number</Text>
                <Text style={[styles.th, { flex: 1 }]}>Amount</Text>
                <Text
                  style={[
                    styles.th,
                    { width: 72, textAlign: "right", paddingRight: 6 },
                  ]}
                  numberOfLines={1}
                >
                  Delete
                </Text>
              </View>

              {list.map((r) => (
                <View key={r.num} style={styles.row}>
                  <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
                    {r.num}
                  </Text>
                  <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
                    ₹{r.amount}
                  </Text>
                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => delOne(r.num)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.delTxt} numberOfLines={1}>
                      DELETE
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!list.length && (
                <Text style={styles.emptyText}>
                  No items yet. Enter numbers & amount and tap ADD.
                </Text>
              )}
              <View style={{ height: 80 }} />
            </View>
          </ScrollView>

          <BetCartBar
            onSuccess={() => {
              setRows({});
              resetInputs();
            }}
            gameId={gameIdParam}
            gameName={title}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  kb: { flex: 1 },

  wrap: { flex: 1, backgroundColor: THEME.bg },

  header: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: THEME.textDark },

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

  // ✅ body padding + room for bottom fixed bar
  bodyContent: {
    flexGrow: 1,
    paddingBottom: 140,
    paddingTop: 6,
  },

  // ✅ centered container on big screens
  container: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  lbl: { fontWeight: "700", color: THEME.textDark, marginBottom: 6 },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  lblLeft: { flex: 1, marginLeft: 0 },
  lblRight: { flex: 1, textAlign: "right", marginRight: 0 },

  numRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  input: {
    height: 44,
    backgroundColor: THEME.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  numInput: { flex: 1, marginHorizontal: 6 },
  crossMid: {
    width: 28,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textMuted,
  },

  addRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addTxt: { color: "#fff", fontWeight: "800", marginLeft: 6 },

  tableHead: {
    flexDirection: "row",
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  th: { color: "#fff", fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  td: { color: THEME.textDark, fontWeight: "600" },

  delBtn: {
    marginLeft: "auto",
    backgroundColor: THEME.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  delTxt: { color: "#fff", fontWeight: "800" },

  emptyText: { color: THEME.textMuted, textAlign: "center", marginTop: 14 },
});
