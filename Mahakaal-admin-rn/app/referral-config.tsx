import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Switch, Pressable, StyleSheet, Alert, useWindowDimensions } from "react-native";
import { api } from "../lib/api";

type ReferralConfig = {
  enabled: boolean;
  ratePercent: number;
};

const MAX_CONTENT = 800;

export default function ReferralConfigScreen() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, MAX_CONTENT);

  const [config, setConfig] = useState<ReferralConfig>({ enabled: true, ratePercent: 2 });
  const [rateInput, setRateInput] = useState("2");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res: any = await api.referralConfig();
      const cfg = res?.config || res;
      if (cfg) {
        const enabled = cfg.enabled !== false;
        const ratePercent = Number(cfg.ratePercent ?? 2) || 0;
        setConfig({ enabled, ratePercent });
        setRateInput(String(ratePercent));
      }
    } catch (e: any) {
      Alert.alert("Referral Config", e?.message || "Failed to load config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    const num = Number(rateInput);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      Alert.alert("Invalid Rate", "Commission % must be between 0 and 100.");
      return;
    }

    try {
      setLoading(true);
      const res: any = await api.saveReferralConfig({
        enabled: config.enabled,
        ratePercent: num,
      });
      const cfg = res?.config || res;
      const enabled = cfg.enabled !== false;
      const ratePercent = Number(cfg.ratePercent ?? num) || 0;
      setConfig({ enabled, ratePercent });
      setRateInput(String(ratePercent));
      Alert.alert("Saved", "Referral commission configuration updated.");
    } catch (e: any) {
      Alert.alert("Referral Config", e?.message || "Failed to save config");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8f5ff" }} contentContainerStyle={[styles.container, { maxWidth: maxW }]}>
      <View style={styles.card}>
        <Text style={styles.title}>Referral / Commission Settings</Text>
        <Text style={styles.subtitle}>
          Control whether referral commission is applied, and what percentage of operator profit
          (stake minus winnings) is shared with referrers.
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Enable Referral Commission</Text>
          <Switch
            value={config.enabled}
            onValueChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Commission Rate (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 2"
            placeholderTextColor="#9ca3af"
            value={rateInput}
            onChangeText={setRateInput}
          />
          <Text style={styles.help}>
            Example: 2% means if the operator profit on a settled bet is ₹100, the referrer earns ₹2.
          </Text>
        </View>

        <Pressable style={[styles.button, styles.buttonPrimary]} disabled={loading} onPress={onSave}>
          <Text style={styles.buttonPrimaryText}>{loading ? "Saving..." : "Save Settings"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 800,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#4b5563",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontWeight: "700",
    color: "#374151",
  },
  field: {
    gap: 6,
  },
  input: {
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  help: {
    fontSize: 11,
    color: "#6b7280",
  },
  button: {
    marginTop: 8,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#6C2BD9",
  },
  buttonPrimaryText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});

