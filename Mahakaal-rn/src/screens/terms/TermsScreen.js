// src/screens/terms/TermsScreen.js
import React, { useEffect, useLayoutEffect, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../api";
import { THEME } from "../../theme";

const LOGO = require("../../../assets/icon-512.png");
const APP_BG = THEME.bg;
/** order + id map (server ids → Hindi titles) */
const ORDER = [
  "FARIDABAD",
  "GHAZIABAD",
  "DISAWAR",
  "OLDDISAWAR",
  "GALI",
  "SHREEGANESH",
  "DELHIBAZAR",
  "PATNA",
  "NEWFARIDABAD",
];
const TITLES_HI = {
  FARIDABAD: "फ़रीदाबाद",
  GHAZIABAD: "गाज़ियाबाद",
  DISAWAR: "दिशावर",
  OLDDISAWAR: "पुराना दिशावर",
  GALI: "गली",
  SHREEGANESH: "श्री गणेश",
  DELHIBAZAR: "दिल्ली बाज़ार",
  PATNA: "पटना",
  NEWFARIDABAD: "नया फ़रीदाबाद",
};
const normalizeId = (x) => String(x || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** Fallback lines (exact wordings you sent) */
const TIME_LINES_FALLBACK = {
  FARIDABAD:   { playUntil: "शाम 5:35 बजे तक खेलें",   resultAt: "परिणाम 6:30 बजे", cutoff: "₹100 से ऊपर की बोली शाम 5:25 बजे के बाद स्वीकार नहीं की जाएगी" },
  GHAZIABAD:   { playUntil: "रात 8:45 बजे तक खेलें",   resultAt: "परिणाम 9:50 बजे", cutoff: "₹100 से ऊपर की बोली रात 8:40 बजे के बाद स्वीकार नहीं की जाएगी" },
  DISAWAR:     { playUntil: "सुबह 2:10 बजे तक खेलें",  resultAt: "परिणाम 5:15 बजे", cutoff: "₹100 से ऊपर की बोली रात 2:00 बजे के बाद स्वीकार नहीं की जाएगी" },
  OLDDISAWAR:  { playUntil: "रात 1:20 बजे तक खेलें",   resultAt: "परिणाम 2:30 बजे", cutoff: "₹100 से ऊपर की बोली रात 1:10 बजे के बाद स्वीकार नहीं की जाएगी" },
  GALI:        { playUntil: "रात 10:45 बजे तक खेलें",  resultAt: "परिणाम 12:20 बजे", cutoff: "₹100 से ऊपर की बोली रात 10:35 बजे के बाद स्वीकार नहीं की जाएगी" },
  SHREEGANESH: { playUntil: "शाम 4:05 बजे तक खेलें",   resultAt: "परिणाम 4:40 बजे", cutoff: "₹100 से ऊपर की बोली शाम 3:55 बजे के बाद स्वीकार नहीं की जाएगी" },
  DELHIBAZAR:  { playUntil: "दोपहर 2:35 बजे तक खेलें", resultAt: "परिणाम 3:10 बजे", cutoff: "₹100 से ऊपर की बोली दोपहर 2:25 बजे के बाद स्वीकार नहीं की जाएगी" },
  PATNA:       { playUntil: "शाम 4:30 बजे तक खेलें",   resultAt: "परिणाम 5:20 बजे", cutoff: "₹100 से ऊपर की बोली शाम 4:20 बजे के बाद स्वीकार नहीं की जाएगी" },
  NEWFARIDABAD:{ playUntil: "शाम 6:15 बजे तक खेलें",   resultAt: "परिणाम 7:20 बजे", cutoff: "₹100 से ऊपर की बोली शाम 6:05 बजे के बाद स्वीकार नहीं की जाएगी" },
};

/* ----------------- time helpers (12h ↔︎ minutes) ----------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toMinutes = (t12) => {
  if (!t12) return null;
  const [time, mer] = t12.trim().split(/\s+/);
  let [h, m] = (time || "0:0").split(":").map((x) => Number(x || 0));
  const am = (mer || "").toUpperCase() === "AM";
  if (am) { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
  return (h * 60 + m + 1440) % 1440;
};
const fromMinutes = (mins0) => {
  let mins = ((mins0 % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const mer = h24 < 12 ? "AM" : "PM";
  let h12 = h24 % 12; if (h12 === 0) h12 = 12;
  return { h24, h12, m, mer };
};
const hindiPart = (h24) => {
  if (h24 >= 4 && h24 < 12) return "सुबह";
  if (h24 >= 12 && h24 < 16) return "दोपहर";
  if (h24 >= 16 && h24 < 19) return "शाम";
  return "रात";
};
const labelFromT12 = (t12) => {
  const mm = toMinutes(t12);
  if (mm == null) return null;
  const { h24, h12, m } = fromMinutes(mm);
  return { part: hindiPart(h24), timeText: `${h12}:${pad2(m)}` };
};
const labelFromMinus = (t12, minus = 10) => {
  const mm = toMinutes(t12);
  if (mm == null) return null;
  const { h24, h12, m } = fromMinutes(mm - minus);
  return { part: hindiPart(h24), timeText: `${h12}:${pad2(m)}` };
};

export default function TermsScreen() {
  const navigation = useNavigation();
  const [serverGames, setServerGames] = useState(null); // [{id,name,start,end,...}]

  const goBackSmart = useCallback(() => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const root = navigation.getParent?.();
    root?.navigate?.("MainTabs", { screen: "Home" }) ||
      navigation.navigate("MainTabs", { screen: "Home" });
  }, [navigation]);


  useEffect(() => {
    (async () => {
      try {
        if (!API.games) return;
        const r = await API.games();
        const arr = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : null);
        if (arr) setServerGames(arr);
      } catch {
        // ignore → fallback stays
      }
    })();
  }, []);

  const timeLines = useMemo(() => {
    const base = ORDER.map((id) => {
      const title = TITLES_HI[id] || id;
      const fb = TIME_LINES_FALLBACK[id];
      return { id, title, ...fb };
    });

    if (!serverGames) return base;

    const byId = {};
    for (const g of serverGames) {
      const id = normalizeId(g.id || g.name);
      byId[id] = g;
    }

    return base.map((row) => {
      const g = byId[row.id];
      if (!g || !g.end) return row;

      const endLabel = labelFromT12(g.end);
      const cutLabel = labelFromMinus(g.end, 10);

      const playUntil =
        endLabel ? `${endLabel.part} ${endLabel.timeText} बजे तक खेलें` : row.playUntil;

      const cutoff =
        cutLabel
          ? `₹100 से ऊपर की बोली ${cutLabel.part} ${cutLabel.timeText} बजे के बाद स्वीकार नहीं की जाएगी`
          : row.cutoff;

      const resultAt = row.resultAt;
      return { ...row, playUntil, cutoff, resultAt };
    });
  }, [serverGames]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBackSmart} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Terms & Conditions</Text>
            <View style={{ width: 40 }} />
          </View>
          <Image source={LOGO} style={s.logo} resizeMode="contain" />

          <View style={s.card}>
            <Text style={s.h1}>Mahakaal</Text>
            <Text style={s.h2}>नियम और शर्तें</Text>

            {/* Rates / General */}
            <View style={s.block}>
              <Text style={s.line}><Text style={s.red}>₹10 सिंगल जोड़ी</Text> = ₹900</Text>
              <Text style={s.line}><Text style={s.red}>₹10 हड़फ</Text> (A.B.) = ₹90</Text>
              <Text style={s.line}>जमा करने का समय: 24×7</Text>
              <Text style={s.line}>नकदी का समय: सुबह 9:00 बजे से दोपहर 1:00 बजे तक</Text>
              <Text style={s.line}>जमा प्रक्रिया का समय: 2–3 घंटे</Text>
            </View>

            <Text style={s.section}>खेल का समय</Text>

            <View style={s.list}>
              {timeLines.map((g) => (
                <View key={g.id} style={s.item}>
                  <View style={s.bulletRow}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>
                      {g.title} – {g.playUntil}
                      {g.resultAt ? `, ${g.resultAt}` : ""}
                    </Text>
                  </View>

                  {g.cutoff ? (
                    <View style={s.cutoffBox}>
                      <Text style={s.cutoffText}>{g.cutoff}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            <Text style={s.section}>महत्वपूर्ण नियम</Text>
            <View style={s.block}>
              <Text style={s.line}>
                प्रत्येक यूज़र के लिए अधिकतम सीमा ₹2000 है। ₹2000 से ऊपर की बोली अस्वीकार कर दी जाएगी।
              </Text>
              <Text style={s.line}>जीतने की स्थिति में राशि का भुगतान हमेशा समय पर होगा।</Text>
            </View>

            <Text style={s.section}>रेफर करें और कमाएँ</Text>
            <View style={s.block}>
              <Text style={s.line}>
                अपने दोस्तों को रेफर करें और उनके हर खेल पर जीवनभर 5% कमीशन कमाएँ।
              </Text>
            </View>

            <Text style={s.footNote}>हर महीने का अंतिम दिन अवकाश रहेगा।</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },

  // ✅ keep scroll stable on web + mobile
  scroll: { flex: 1, backgroundColor: APP_BG },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  // ✅ center content with max width for readability
  container: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  backBtn: { padding: 8, marginLeft: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#111827" },

  logo: { width: 72, height: 72, borderRadius: 36, alignSelf: "center", marginBottom: 10 },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 24,
    elevation: 3,
    ...Platform.select({
      web: { boxShadow: "0 16px 28px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    }),
  },

  h1: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 2, color: "#111827" },
  h2: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10, color: "#374151" },

  section: { marginTop: 14, marginBottom: 8, color: "#0e7490", fontWeight: "900" },

  block: { marginBottom: 6 },

  line: { marginBottom: 6, color: "#111827", lineHeight: 20 },

  red: { color: "#dc2626", fontWeight: "800" },

  list: { marginBottom: 6 },

  item: { marginBottom: 12 },

  bulletRow: { flexDirection: "row", alignItems: "flex-start" },
  bulletDot: { width: 16, lineHeight: 22, color: "#111827", fontWeight: "900" },
  bulletText: { flex: 1, color: "#111827", lineHeight: 22 },

  // ✅ make cutoff readable and consistent
  cutoffBox: {
    marginTop: 6,
    marginLeft: 16,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  cutoffText: { color: "#dc2626", fontSize: 12, fontWeight: "800", lineHeight: 18 },

  footNote: { textAlign: "center", color: "#ef4444", marginTop: 12, fontWeight: "900" },
});
