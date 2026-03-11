// src/screens/deposit/DepositScreen.js
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { BASE_URL_PUBLIC } from "../../api";
import { THEME } from "../../theme";

const MIN_AMOUNT = 50;

export default function DepositScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [transactionNote, setTransactionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upiId = scanner?.upiId || process.env.EXPO_PUBLIC_UPI_ID || "";
  const qrUri = scanner?.imageUrl
    ? (scanner.imageUrl.startsWith("http")
        ? scanner.imageUrl
        : `${(BASE_URL_PUBLIC || "").replace(/\/+$/, "")}${scanner.imageUrl.startsWith("/") ? "" : "/"}${scanner.imageUrl}`)
    : null;

  const fetchScanner = useCallback(async () => {
    try {
      setScannerLoading(true);
      const r = await api.get("/scanner");
      setScanner(r?.data?.scanner || null);
    } catch {
      setScanner(null);
    } finally {
      setScannerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScanner();
  }, [fetchScanner]);

  const copyUpi = async () => {
    if (upiId) {
      await Clipboard.setStringAsync(upiId);
      Alert.alert("Copied", "UPI ID copied to clipboard");
    } else {
      Alert.alert("UPI not set", "Admin has not set UPI ID yet. Contact support.");
    }
  };

  const pickScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Camera roll access needed to pick payment screenshot.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setScreenshotPreview(asset.uri);
      setScreenshot(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to pick image");
    }
  };

  const onlyDigits = (t) => (String(t || "").replace(/\D/g, ""));
  const amtNum = parseInt(onlyDigits(amount) || "0", 10);

  const submitDeposit = async () => {
    if (!amtNum || amtNum < MIN_AMOUNT) {
      Alert.alert("Amount", `Minimum deposit is ₹${MIN_AMOUNT}`);
      return;
    }
    if (!screenshot) {
      Alert.alert("Screenshot", "Upload payment screenshot before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/deposit/request", {
        amount: amtNum,
        screenshot,
        transactionNote: transactionNote.trim(),
      });
      Alert.alert("Submitted", "Your deposit request has been sent. Admin will verify and credit your wallet shortly.", [
        { text: "OK", onPress: () => navigation.goBack?.() || navigation.navigate?.("Root", { screen: "MainTabs", params: { screen: "Wallet" } }) },
      ]);
      setAmount("");
      setScreenshot(null);
      setScreenshotPreview(null);
      setTransactionNote("");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to submit deposit request";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack?.()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>UPI Deposit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.wrap}>
        {/* UPI QR Card */}
        <View style={s.card}>
          <Text style={s.title}>Scan & Pay</Text>
          <Text style={s.sub}>Scan the QR or use UPI ID below. Upload screenshot after payment.</Text>

          {scannerLoading ? (
            <View style={s.qrPlaceholder}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : qrUri ? (
            <Image source={{ uri: qrUri }} style={s.qrImg} resizeMode="contain" />
          ) : (
            <View style={[s.qrPlaceholder, { backgroundColor: "#f3f4f6" }]}>
              <Ionicons name="qr-code-outline" size={80} color="#9ca3af" />
              <Text style={s.qrEmpty}>QR not configured. Contact admin.</Text>
            </View>
          )}

          {upiId ? (
            <>
              <Text style={s.upiLabel}>UPI ID</Text>
              <View style={s.upiRow}>
                <Text style={s.upiText} numberOfLines={1}>
                  {upiId}
                </Text>
                <TouchableOpacity style={s.copyBtn} onPress={copyUpi}>
                  <Ionicons name="copy-outline" size={18} color="#fff" />
                  <Text style={s.copyText}>Copy UPI ID</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>

        {/* Deposit Form Card */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.title}>Submit Deposit Request</Text>

          <Text style={s.label}>Enter Deposit Amount (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(onlyDigits(t))}
            placeholder={`Min ₹${MIN_AMOUNT}`}
            keyboardType={Platform.select({ ios: "number-pad", default: "numeric" })}
            style={s.input}
          />

          <Text style={s.label}>Upload Payment Screenshot</Text>
          <TouchableOpacity style={[s.uploadBtn, submitting && { opacity: 0.6 }]} onPress={pickScreenshot} disabled={submitting}>
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text style={s.uploadText}>Upload Payment Screenshot</Text>
          </TouchableOpacity>

          {screenshotPreview ? (
            <View style={s.previewWrap}>
              <Text style={s.previewLabel}>Preview</Text>
              <Image source={{ uri: screenshotPreview }} style={s.previewImg} resizeMode="contain" />
            </View>
          ) : null}

          <Text style={s.label}>Transaction Note (optional)</Text>
          <TextInput
            value={transactionNote}
            onChangeText={setTransactionNote}
            placeholder="e.g. UTR / ref number"
            style={[s.input, { height: 44 }]}
          />

          <TouchableOpacity
            style={[s.submitBtn, (submitting || !screenshot) && { opacity: 0.7 }]}
            onPress={submitDeposit}
            disabled={submitting || !screenshot}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.submitText}>Submit Deposit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.bg,
  },
  backBtn: { padding: 8, marginLeft: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#111827" },
  scroll: { flex: 1 },
  wrap: { padding: 16, paddingBottom: 32 },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 6 },
  sub: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  qrImg: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#fff" },
  qrPlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrEmpty: { marginTop: 8, color: "#6b7280", fontWeight: "700" },
  upiLabel: { marginTop: 12, fontSize: 12, fontWeight: "700", color: "#374151" },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 10,
  },
  upiText: { flex: 1, fontSize: 14, fontWeight: "800", color: THEME.primary },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  label: { marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: "700", color: "#374151" },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.pink,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  uploadText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  previewWrap: { marginTop: 12, alignItems: "center" },
  previewLabel: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 8 },
  previewImg: { width: 200, height: 140, borderRadius: 10, backgroundColor: "#f3f4f6" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
