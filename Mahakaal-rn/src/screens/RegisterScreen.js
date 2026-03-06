// src/screens/RegisterScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Image,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API, saveSession } from "../api";
import { THEME } from "../theme";

function getCodeFromUrl(url) {
  if (!url) return "";
  try {
    const idx = url.indexOf("?");
    const search = idx >= 0 ? url.slice(idx) : "";
    const params = new URLSearchParams(search);
    return String(params.get("code") || "").trim().toUpperCase().slice(0, 16);
  } catch {
    const m = (url || "").match(/[?&]code=([^&]+)/i);
    return m ? String(m[1]).trim().toUpperCase().slice(0, 16) : "";
  }
}

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(width - 32, 400);
  const route = useRoute();

  // form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // ✅ referral from deep link or route params
  const [referralCode, setReferralCode] = useState(route.params?.code || "");

  useEffect(() => {
    const code = route.params?.code || getCodeFromUrl(route.params?.url);
    if (code) setReferralCode(code);
  }, [route.params?.code, route.params?.url]);

  useEffect(() => {
    const handler = ({ url }) => {
      const code = getCodeFromUrl(url);
      if (code) setReferralCode(code);
    };
    const sub = Linking.addEventListener("url", handler);
    Linking.getInitialURL().then((url) => {
      const code = getCodeFromUrl(url);
      if (code) setReferralCode((prev) => prev || code);
    });
    return () => sub.remove();
  }, []);

  // ui
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const normalizePhone = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 10);
  const isPhone = (v) => /^\d{10}$/.test(normalizePhone(v));

  const normalizeCode = (v) =>
    String(v ?? "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 16);

  const pickError = (e) => {
    const d = e?.response?.data;
    return d?.detail || d?.error || d?.message || e?.message || "Something went wrong";
  };

  const notify = (title, message) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const onRegister = async () => {
    try {
      setMsg("");
      const ph = normalizePhone(phone);

      if (!name.trim()) return notify("Username", "Please enter username.");
      if (!isPhone(ph)) return notify("Phone", "Enter a valid 10-digit phone.");
      if ((password || "").trim().length < 4) return notify("Password", "Minimum 4 characters.");

      setLoading(true);

      const payload = {
        username: name.trim(),
        phone: ph,
        password: password.trim(),
      };

      // ✅ only send if provided
      const code = normalizeCode(referralCode);
      if (code) payload.referralCode = code;

      const res = await API.register(payload);
      const d = res?.data ?? res;

      // ✅ pick token/user safely (works with many backend shapes)
      const token = d?.token || d?.jwt || d?.accessToken || d?.idToken || "";
      const user = d?.user || d?.data?.user || d?.data || null;

      // ✅ save in SAME structure as login
      await saveSession({
        token: token || undefined,
        user: user || undefined,
      });

      setMsg("✅ Registered successfully! Redirecting to Login...");
      notify("Success ✅", "Account created successfully!");

      if (navigation && typeof navigation.replace === "function") navigation.replace("Login");
      else navigation.navigate("Login");
    } catch (e) {
      const errMsg = String(pickError(e));
      setMsg("❌ " + errMsg);
      notify("Register Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.wrap}>
      <Image source={require("../../assets/icon-512.png")} style={s.logo} />

      <View style={[s.card, { maxWidth: cardMaxW }]}>
        <Text style={s.title}>
          <Ionicons name="person-add" size={20} /> Register
        </Text>

        <Text style={s.label}>Username:</Text>
        <TextInput
          style={s.input}
          placeholder="Enter username"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Text style={s.label}>Phone:</Text>
        <TextInput
          style={s.input}
          placeholder="Enter phone number"
          keyboardType="number-pad"
          value={phone}
          onChangeText={(t) => setPhone(normalizePhone(t))}
          maxLength={10}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <Text style={s.label}>Password:</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            style={[s.input, { paddingRight: 44 }]}
            placeholder="Enter password"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={onRegister}
          />
          <TouchableOpacity
            style={s.eyeBtn}
            onPress={() => setShowPass((v) => !v)}
            hitSlop={8}
          >
            <Ionicons name={showPass ? "eye-off" : "eye"} size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* ✅ Referral Code (optional) */}
        <Text style={s.label}>Referral Code (optional):</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. MKAB12CD"
          value={referralCode}
          onChangeText={(t) => setReferralCode(normalizeCode(t))}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.7 }]}
          onPress={onRegister}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>✅ Register</Text>}
        </TouchableOpacity>

        {!!msg && <Text style={s.msg}>{msg}</Text>}

        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={s.linkTxt}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: THEME.purple,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: 100, height: 100, marginBottom: 12, borderRadius: 50, borderWidth: 3, borderColor: THEME.pink },

  card: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    shadowColor: THEME.purple,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 12, textAlign: "center", color: THEME.purple },

  label: { marginTop: 6, marginBottom: 4, fontWeight: "700", color: "#111827" },
  input: {
    borderWidth: 1.5,
    borderColor: THEME.purple,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  eyeBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },

  btn: {
    backgroundColor: THEME.purple,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  msg: { marginTop: 10, textAlign: "center", fontWeight: "700" },

  linkBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
  },
  linkTxt: { color: THEME.pink, fontWeight: "800" },
});
