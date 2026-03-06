import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

// ✅ IMPORTANT: import default axios client too (api)
import api, { API, clearSession } from "../../api";
import { THEME } from "../../theme";

const MAX_WIDTH = 720;

export default function ChangePasswordScreen() {
  const navigation = useNavigation();

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  const notify = (title, message) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const pickError = (e) => {
    const d = e?.response?.data;
    return d?.detail || d?.error || d?.message || e?.message || "Something went wrong";
  };

  const onSubmit = async () => {
    const o = String(oldPass || "").trim();
    const n = String(newPass || "").trim();
    const c = String(confirmPass || "").trim();

    if (!o) return notify("Old Password", "Please enter old password.");
    if (!n) return notify("New Password", "Please enter new password.");
    if (n.length < 4) return notify("New Password", "Minimum 4 characters.");
    if (n !== c) return notify("Confirm Password", "New password does not match.");
    if (o === n) return notify("New Password", "New password must be different from old password.");

    try {
      setLoading(true);

      const payload = { oldPassword: o, newPassword: n, confirmPassword: c };

      // ✅ Works in BOTH cases:
      // 1) if API.changePassword exists
      // 2) else fallback to direct endpoint
      const res = API?.changePassword
        ? await API.changePassword(payload)
        : await api.post("/auth/change-password", payload);

      const msg =
        res?.data?.message ||
        res?.data?.successMessage ||
        "Password updated successfully.";

      notify("Success ✅", msg);

      // ✅ best practice: force re-login after password change
      await clearSession();

      if (navigation?.reset) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        navigation.navigate("Login");
      }
    } catch (e) {
      notify("Update Failed ❌", String(pickError(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={StatusBar.currentHeight || 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ Center frame */}
          <View style={s.frame}>
            <View style={s.logoWrap}>
              <Image source={require("../../../assets/icon-512.png")} style={s.logo} />
            </View>

            <View style={s.card}>
              <Text style={s.title}>🔐 Change Password</Text>

              <Text style={s.label}>Old Password</Text>
              <TextInput
                style={s.input}
                secureTextEntry
                placeholder="Enter old password"
                value={oldPass}
                onChangeText={setOldPass}
                returnKeyType="next"
              />

              <Text style={s.label}>New Password</Text>
              <TextInput
                style={s.input}
                secureTextEntry
                placeholder="Enter new password"
                value={newPass}
                onChangeText={setNewPass}
                returnKeyType="next"
              />

              <Text style={s.label}>Confirm New Password</Text>
              <TextInput
                style={s.input}
                secureTextEntry
                placeholder="Confirm new password"
                value={confirmPass}
                onChangeText={setConfirmPass}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />

              <TouchableOpacity
                style={[s.primary, loading && { opacity: 0.7 }]}
                activeOpacity={0.9}
                onPress={onSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <Text style={s.hint}>
                Note: Password update hon te automatic logout ho ju ga.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },

  // ✅ scroll works on small phones + center on big phones
  scrollContent: { flexGrow: 1, alignItems: "center", paddingBottom: 24 },

  // ✅ global center frame
  frame: { width: "100%", maxWidth: MAX_WIDTH },

  logoWrap: { alignItems: "center", paddingTop: 24, paddingBottom: 8 },
  logo: { width: 100, height: 100, borderRadius: 60 },

  card: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  title: { fontSize: 26, fontWeight: "800", marginBottom: 12 },
  label: { marginTop: 10, marginBottom: 6, fontWeight: "700", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },

  primary: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  hint: { marginTop: 10, color: "#64748b", fontWeight: "600" },
});
