import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ one single import (no duplicate)
import api, { API, saveSession, setUserToken, clearUserToken } from "../api";
import { THEME } from "../theme";

const ADMIN_WA_NUMBER = "+919784903092";

const onlyDigits = (v) => (v || "").replace(/\D/g, "");
const normalizePhone = (v) => onlyDigits(v).slice(0, 10);
const isPhone = (v) => /^\d{10}$/.test(normalizePhone(v));

export default function LoginScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(width - 32, 400);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const openWhatsApp = () => {
    const digits = ADMIN_WA_NUMBER.replace(/^\+/, "");
    return Linking.openURL(`https://wa.me/${digits}`);
  };

  const pickError = (e) => {
    const d = e?.response?.data;
    return d?.detail || d?.error || d?.message || e?.message || "Login failed";
  };

  const onLogin = async () => {
    try {
      const ph = normalizePhone(phone);
      const pass = (password || "").trim();

      if (!isPhone(ph)) return Alert.alert("Login", "Enter a valid 10-digit phone.");
      if (!pass) return Alert.alert("Login", "Please enter password.");

      setLoading(true);

      // ✅ clean stale session
      try {
        await AsyncStorage.multiRemove(["token", "user"]);
        if (api?.defaults?.headers?.common?.Authorization) {
          delete api.defaults.headers.common.Authorization;
        }
        try { clearUserToken?.(); } catch {}
      } catch {}

      // ✅ ONLY phone + password
      const res = await API.login({ phone: ph, password: pass });
      const data = res?.data ?? res;

      const token = data?.token || data?.jwt || data?.accessToken || data?.idToken;
      let userFromLogin = data?.user;

      if (!token) throw new Error("Token not returned from login");

      // ✅ set axios header
      try {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
      } catch {}

      // ✅ set wrapper token
      try { setUserToken?.(token); } catch {}

      // ✅ Save session (respect remember)
      if (remember) {
        await saveSession({ token, user: userFromLogin });
      } else {
        // not remembered: only keep in axios + wrapper token, no persistent storage
        try { await saveSession({ user: userFromLogin }); } catch {}
        try { await AsyncStorage.removeItem("token"); } catch {}
      }

      // ✅ fetch /me if user missing (handle {success,user} OR direct)
      if (!userFromLogin) {
        try {
          const meRes = await api.get("/me").catch(() => api.get("/api/me"));
          const me = meRes?.data?.user ?? meRes?.data;
          if (me) {
            userFromLogin = me;
            if (remember) await saveSession({ user: me });
          }
        } catch (err) {
          console.warn("[login] /me failed:", err?.response?.data || err?.message || err);
        }
      }

      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (e) {
      Alert.alert("Login Error", String(pickError(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.wrap}>
      <Image source={require("../../assets/icon-512.png")} style={s.logo} />

      <View style={[s.card, { maxWidth: cardMaxW }]}>
        <Text style={s.title}>Login</Text>

        <TouchableOpacity onPress={openWhatsApp} activeOpacity={0.7}>
          <Text style={s.help}>
            <Text style={{ color: "#10b981" }}>🟢 WhatsApp</Text> Need Help?{" "}
            <Text style={{ color: "#10b981" }}>Chat on WhatsApp</Text>
          </Text>
        </TouchableOpacity>

        <TextInput
          style={s.input}
          placeholder="Phone (10-digit)"
          keyboardType="number-pad"
          value={phone}
          onChangeText={(t) => setPhone(normalizePhone(t))}
          autoCapitalize="none"
          autoComplete="tel"
          returnKeyType="next"
          maxLength={10}
        />

        <View style={s.inputWrap}>
          <TextInput
            style={[s.input, { paddingRight: 44 }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            returnKeyType="go"
            onSubmitEditing={onLogin}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass((v) => !v)}>
            <Ionicons name={showPass ? "eye-off" : "eye"} size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.rememberRow} onPress={() => setRemember(!remember)}>
          <View style={[s.checkbox, remember && s.checkboxOn]} />
          <Text style={s.rememberText}>Remember Me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.loginBtn, loading && { opacity: 0.7 }]}
          activeOpacity={0.9}
          onPress={onLogin}
          disabled={loading}
        >
          <Text style={s.loginText}>{loading ? "Logging in..." : "Login"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.purple, justifyContent: "center", alignItems: "center" },
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
  title: { fontSize: 26, fontWeight: "800", marginBottom: 8, textAlign: "center", color: THEME.purple },
  help: { color: THEME.pink, textAlign: "center", marginBottom: 14, fontWeight: "600" },
  inputWrap: { position: "relative" },
  input: {
    borderWidth: 1.5,
    borderColor: THEME.purple,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    marginVertical: 6,
    backgroundColor: "#fff",
  },
  eyeBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  rememberRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rememberText: { marginLeft: 8, color: "#111827" },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: "#94a3b8", backgroundColor: "#fff" },
  checkboxOn: { backgroundColor: THEME.purple, borderColor: THEME.purple },
  loginBtn: { backgroundColor: THEME.purple, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  loginText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
