import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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

type ScannerRow = {
  _id: string;
  phone: string;
  username: string;
  imageUrl: string;
  upiId?: string;
  note?: string;
  active: boolean;
  updatedAt?: string;
};

function normPhone(v: string) {
  return String(v || "").replace(/\D/g, "").slice(-10);
}

const MAX_CONTENT = 980;

export default function ScannerScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, MAX_CONTENT);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ScannerRow[]>([]);

  const [imageUrl, setImageUrl] = useState("");
  const [upiId, setUpiId] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);

  const filteredPhone = useMemo(() => normPhone(phone), [phone]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filteredPhone) params.phone = filteredPhone;
      const res: any = await api.adminScanners(params);
      const list: any[] = res?.scanners || res?.items || res?.rows || [];
      const mapped: ScannerRow[] = list.map((s: any) => ({
        _id: String(s?._id || s?.id || ""),
        phone: String(s?.user?.phone || ""),
        username: String(s?.user?.username || "User"),
        imageUrl: String(s?.imageUrl || ""),
        upiId: s?.upiId ? String(s.upiId) : "",
        note: s?.note ? String(s.note) : "",
        active: s?.active !== false,
        updatedAt: s?.updatedAt || s?.createdAt || "",
      }));
      setRows(mapped.filter((x) => x._id));

      // If searching a single phone, prefill form with latest row
      if (filteredPhone && mapped.length) {
        const latest = mapped[0];
        setImageUrl(latest.imageUrl || "");
        setUpiId(latest.upiId || "");
        setNote(latest.note || "");
        setActive(latest.active);
      }
    } catch (e: any) {
      Alert.alert("Scanner", e?.message || "Failed to load scanners");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPhone]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    const p = filteredPhone;
    if (!p) return Alert.alert("Phone Required", "Enter user mobile number first.");
    const url = imageUrl.trim();
    if (!url) return Alert.alert("Image URL Required", "Paste the QR/scanner image URL.");

    try {
      setLoading(true);
      await api.adminSaveScanner({
        phone: p,
        imageUrl: url,
        upiId: upiId.trim(),
        note: note.trim(),
        active,
      });
      Alert.alert("Saved", "Scanner updated for this user.");
      await load();
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert("Delete Scanner?", "This will remove the scanner record.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await api.adminDeleteScanner(id);
            await load();
          } catch (e: any) {
            Alert.alert("Delete Failed", e?.message || "Failed");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8f5ff" }} contentContainerStyle={[styles.page, { maxWidth: maxW }]}>
      <View style={styles.card}>
        <Text style={styles.title}>Scanner / QR Management</Text>
        <Text style={styles.sub}>
          Search user by mobile number, then paste the QR image URL to show in user wallet.
        </Text>

        <View style={styles.row}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter user mobile number"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            style={styles.input}
            onSubmitEditing={load}
            returnKeyType="search"
          />
          <Pressable style={[styles.btn, styles.btnGreen]} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={16} color="#fff" />}
            <Text style={styles.btnText}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>QR Image URL</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://... or upload"
                placeholderTextColor="#9ca3af"
                style={[styles.input, { flex: 1, minWidth: 200 }]}
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.btn, styles.btnBlue]}
                onPress={async () => {
                  try {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== "granted") {
                      Alert.alert("Permission", "Camera roll access is needed to pick an image.");
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
                    const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
                    setLoading(true);
                    const res: any = await api.adminUploadImage(base64);
                    const url = res?.url;
                    if (url) {
                      const full = url.startsWith("http") ? url : `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
                      setImageUrl(full);
                    }
                  } catch (e: any) {
                    Alert.alert("Upload", e?.message || "Upload failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="image" size={16} color="#fff" />
                )}
                <Text style={styles.btnText}>Upload</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>UPI ID (optional)</Text>
            <TextInput
              value={upiId}
              onChangeText={setUpiId}
              placeholder="example@upi"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Shown for admin reference"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />
          </View>

          <View style={styles.row}>
            <Pressable
              onPress={() => setActive((v) => !v)}
              style={[styles.btn, active ? styles.btnBlue : styles.btnGray]}
              disabled={loading}
            >
              <Ionicons name={active ? "checkmark-circle" : "close-circle"} size={16} color="#fff" />
              <Text style={styles.btnText}>{active ? "Active" : "Inactive"}</Text>
            </Pressable>

            <Pressable style={[styles.btn, styles.btnGreen]} onPress={onSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="save" size={16} color="#fff" />}
              <Text style={styles.btnText}>Save</Text>
            </Pressable>
          </View>
        </View>

        {!!imageUrl.trim() && (
          <View style={{ marginTop: 12, alignItems: "center", gap: 6 }}>
            <Text style={{ fontWeight: "800", color: "#111827" }}>Preview</Text>
            <Image
              source={{ uri: imageUrl.trim() }}
              style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: "#fff" }}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.title}>Saved Scanners</Text>
          <Pressable style={[styles.btn, styles.btnGray]} onPress={load} disabled={loading}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.btnText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: "#6b7280", marginTop: 6, fontWeight: "600" }}>Loading…</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <Text style={{ color: "#9ca3af", fontWeight: "700" }}>No scanners found</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 10 }}>
            {rows.map((r) => (
              <View key={r._id} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: "#111827" }}>
                    {r.username} ({r.phone})
                  </Text>
                  <Text style={{ color: "#6b7280", fontSize: 12 }} numberOfLines={1}>
                    {r.imageUrl}
                  </Text>
                  {!!r.upiId && <Text style={{ color: "#111827", fontSize: 12 }}>UPI: {r.upiId}</Text>}
                  {!!r.note && <Text style={{ color: "#111827", fontSize: 12 }}>Note: {r.note}</Text>}
                  <Text style={{ color: r.active ? "#16a34a" : "#b91c1c", fontWeight: "800", fontSize: 12 }}>
                    {r.active ? "ACTIVE" : "INACTIVE"}
                  </Text>
                </View>

                <Pressable style={[styles.btn, styles.btnRed]} onPress={() => onDelete(r._id)} disabled={loading}>
                  <Ionicons name="trash" size={16} color="#fff" />
                  <Text style={styles.btnText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 980, alignSelf: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  row: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  form: { marginTop: 8, gap: 10 },
  field: { gap: 6 },
  label: { fontWeight: "700", color: "#374151" },
  input: {
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 280,
    flexGrow: 1,
  },
  btn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "800" },
  btnGreen: { backgroundColor: "#6C2BD9" },
  btnBlue: { backgroundColor: "#6C2BD9" },
  btnGray: { backgroundColor: "#6b7280" },
  btnRed: { backgroundColor: "#ef4444" },

  item: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
});

