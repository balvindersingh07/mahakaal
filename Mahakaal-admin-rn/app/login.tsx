// app/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

// ✅ api.ts exports
import { api, persistAdminToken } from "../lib/api";

const LOGO = require("../assets/icon-512.png");

// ✅ STRICT keys (match api.ts)
const ADMIN_KEY = "ADMIN_TOKEN";
const ADMIN_USER_KEY = "ADMIN_USER";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    const pass = password.trim();
    if (!pass) return Alert.alert("Admin Login", "Enter admin password");

    setLoading(true);
    try {
      let data: any;

      // ✅ preferred helper
      if ((api as any).adminLogin) {
        data = await (api as any).adminLogin(pass);
      } else {
        // ✅ fallback if helper missing
        // NOTE: api.post auto-auth picks token by path,
        // but login should be without token; api.adminLogin already does auth=false internally
        data =
          (await (api as any).post("/api/admin/login", { password: pass }).catch(() => null)) ??
          (await (api as any).post("/admin/login", { password: pass }));
      }

      // support multiple backend shapes
      const token: string =
        typeof data === "string"
          ? data
          : data?.token || data?.jwt || data?.accessToken || data?.data?.token;

      const adminUser =
        data?.user || data?.data?.user || { id: "admin", name: "Admin", role: "admin" };

      if (!token) {
        throw new Error(data?.error || data?.message || data?.data?.message || "No token from server");
      }

      // ✅ 1) persist token in api.ts + AsyncStorage (ADMIN_KEY)
      await persistAdminToken(token);

      // ✅ 2) also store admin profile separately (optional)
      await AsyncStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));

      // ✅ 3) (optional but safe) ensure key exists even if api.ts changes later
      // doesn't touch "token" user key
      try {
        await AsyncStorage.setItem(ADMIN_KEY, token);
      } catch {}

      // ✅ navigate (NO window.location.href)
      router.replace("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Login failed";
      Alert.alert("Admin Login", String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Image source={LOGO} style={s.logo} />
      <Text style={s.h1}>Mahakaal Admin</Text>
      <Text style={s.help}>Enter admin password to continue</Text>

      <View style={s.inputWrap}>
        <TextInput
          style={[s.input, { paddingRight: 44 }]}
          placeholder="Admin password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={loading ? undefined : onLogin}
          editable={!loading}
        />
        <Pressable
          style={s.eye}
          onPress={() => setShow((v) => !v)}
          disabled={loading}
        >
          <Ionicons name={show ? "eye-off" : "eye"} size={22} color="#4b5563" />
        </Pressable>
      </View>

      <Pressable
        style={[s.btn, loading && { opacity: 0.7 }]}
        onPress={onLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>Login</Text>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#6C2BD9",
  },
  logo: { width: 88, height: 88, borderRadius: 44, marginBottom: 10, borderWidth: 3, borderColor: "#25D366" },
  h1: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", marginBottom: 4 },
  help: { color: "#DCF8C6", marginBottom: 14, fontWeight: "600" },
  inputWrap: { width: "92%", maxWidth: 420, position: "relative" },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#6C2BD9",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginVertical: 6,
    fontSize: 15,
  },
  eye: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  btn: {
    marginTop: 14,
    backgroundColor: "#6C2BD9",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 160,
    alignItems: "center",
    shadowColor: "#6C2BD9",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
