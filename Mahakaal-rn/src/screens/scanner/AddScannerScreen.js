// src/screens/scanner/AddScannerScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { THEME } from "../../theme";
import api, { BASE_URL_PUBLIC } from "../../api";

export default function AddScannerScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Camera roll access is needed to pick a scanner image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;

      setLoading(true);
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const uploadRes = await api.post("/upload-image", { image: base64 });
      const url = uploadRes?.data?.url;
      if (!url) throw new Error("No URL returned");

      const base = (BASE_URL_PUBLIC || "").replace(/\/+$/, "");
      const fullUrl = url.startsWith("http") ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`;
      const saveRes = await api.post("/scanner", { imageUrl: fullUrl });
      if (saveRes?.data?.scanner) {
        setImageUrl(fullUrl);
        Alert.alert("Saved", "Your scanner/UPI QR has been saved. It will show in your wallet.");
      }
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to upload scanner");
    } finally {
      setLoading(false);
    }
  }, []);

  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate?.("MainTabs", { screen: "Wallet" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Scanner</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Scanner</Text>
          <Text style={styles.subtitle}>
            Upload your UPI QR code or payment scanner image. It will be shown when you add or withdraw money.
          </Text>
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={pickImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>📷 Pick Image</Text>
                <Text style={styles.btnSub}>Choose from gallery</Text>
              </>
            )}
          </TouchableOpacity>
          {imageUrl && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Current Scanner</Text>
              <Image source={{ uri: imageUrl }} style={styles.previewImg} resizeMode="contain" />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  container: { padding: 16, alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  btn: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 4 },
  preview: { marginTop: 12, alignItems: "center" },
  previewLabel: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  previewImg: { width: 200, height: 200, borderRadius: 12, backgroundColor: "#f3f4f6" },
});
