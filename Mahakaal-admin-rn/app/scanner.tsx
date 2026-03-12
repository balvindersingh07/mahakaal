// app/scanner.tsx - Admin: UPI QR upload (shows on user Deposit screen)
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "../lib/api";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "https://mahakaal-0aqy.onrender.com").trim().replace(/\/+$/, "");

async function pickImageFromLibrary(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission", "Camera roll access is needed to pick an image.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false, // true hides confirm button on Android/tablet
    quality: 0.8,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return `data:image/jpeg;base64,${result.assets[0].base64}`;
}

export default function ScannerScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 500);

  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api.adminScanners({});
      const list: any[] = res?.scanners || res?.items || res?.rows || [];
      const global = list.find((s: any) => !s?.user?.phone && !s?.user);
      if (global) {
        setImageUrl(String(global?.imageUrl || "").trim());
        setUpiId(global?.upiId ? String(global.upiId) : "");
      }
    } catch {
      setImageUrl("");
      setUpiId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async () => {
    try {
      setSaving(true);
      const base64 = await pickImageFromLibrary();
      if (!base64) {
        setSaving(false);
        return;
      }
      const res: any = await api.adminUploadImage(base64);
      const url = res?.url || res?.data?.url;
      if (url) {
        const full = url.startsWith("http") ? url : `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
        setImageUrl(full);
        Alert.alert("Uploaded", "QR image ready. Tap Save to update.");
      } else {
        Alert.alert("Upload", "No URL returned. Try again.");
      }
    } catch (e: any) {
      Alert.alert("Upload Error", e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    const url = imageUrl.trim();
    if (!url) {
      Alert.alert("QR Required", "Upload QR image first.");
      return;
    }
    try {
      setSaving(true);
      await api.adminSaveScanner({
        imageUrl: url,
        upiId: upiId.trim(),
        active: true,
      });
      Alert.alert("Saved", "QR updated. Users will see it on UPI Deposit screen.");
      load();
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={[s.wrap, { maxWidth: maxW }]}>
      <Text style={s.title}>UPI Deposit QR</Text>
      <Text style={s.sub}>
        Ye QR user de UPI Deposit screen ch dikhda hai. Time to time upload/update kar sakde ho.
      </Text>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#6C2BD9" />
        </View>
      ) : (
        <>
          <View style={s.card}>
            <Text style={s.label}>QR Image</Text>
            <Pressable
              style={[s.uploadBtn, saving && { opacity: 0.7 }]}
              onPress={onUpload}
              disabled={saving}
            >
              <Ionicons name="image" size={18} color="#fff" />
              <Text style={s.btnText}>Upload QR Image</Text>
            </Pressable>

            {imageUrl ? (
              <View style={s.preview}>
                <Image
                  source={{ uri: imageUrl }}
                  style={s.previewImg}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={s.placeholder}>
                <Ionicons name="qr-code-outline" size={64} color="#9ca3af" />
                <Text style={s.placeholderText}>No QR uploaded</Text>
              </View>
            )}

            <Text style={[s.label, { marginTop: 16 }]}>UPI ID (optional)</Text>
            <TextInput
              value={upiId}
              onChangeText={setUpiId}
              placeholder="example@upi"
              placeholderTextColor="#9ca3af"
              style={s.input}
              autoCapitalize="none"
            />

            <Pressable
              style={[s.saveBtn, (!imageUrl || saving) && { opacity: 0.7 }]}
              onPress={onSave}
              disabled={!imageUrl.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="save" size={18} color="#fff" />
              )}
              <Text style={s.btnText}>Save</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f5ff" },
  wrap: { padding: 16, alignSelf: "center", paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 20 },
  loading: { paddingVertical: 40, alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  label: { fontSize: 14, fontWeight: "800", color: "#374151", marginBottom: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EC4899",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6C2BD9",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  preview: { alignItems: "center", marginVertical: 12 },
  previewImg: { width: 220, height: 220, borderRadius: 12, backgroundColor: "#f9fafb" },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    marginVertical: 12,
  },
  placeholderText: { marginTop: 8, color: "#9ca3af", fontWeight: "700" },
});
