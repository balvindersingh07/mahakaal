// src/screens/menu/MenuDrawer.js
import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearSession } from "../../api";
import { THEME } from "../../theme";

const blue = THEME.pink;

/**
 * ✅ Safe navigation helper:
 * - closes drawer
 * - tries: navigate("Root", {screen: ...})
 * - fallback: navigate(screenName)
 */
function safeNavigate(navigation, screenName, params) {
  try {
    navigation.closeDrawer?.();
  } catch {}

  // Try inside Root navigator (your current pattern)
  try {
    navigation.navigate("Root", { screen: screenName, params });
    return;
  } catch {}

  // Fallback to direct
  try {
    navigation.navigate(screenName, params);
    return;
  } catch {}

  // Parent fallback
  try {
    const p = navigation.getParent?.();
    p?.navigate?.(screenName, params);
  } catch {}
}

export default function MenuDrawer({ navigation }) {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width * 0.9, 400);
  const goTab = useCallback(
    (tabName) => {
      // ✅ go to bottom tabs safely
      try {
        navigation.closeDrawer?.();
      } catch {}

      // Most common pattern:
      // Root -> MainTabs -> (Home/Play/Wallet/Menu)
      try {
        navigation.navigate("Root", {
          screen: "MainTabs",
          params: { screen: tabName },
        });
        return;
      } catch {}

      // fallback
      try {
        navigation.navigate("MainTabs", { screen: tabName });
      } catch {}
    },
    [navigation]
  );

  const goRoot = useCallback(
    (name, params) => {
      safeNavigate(navigation, name, params);
    },
    [navigation]
  );

  const logout = useCallback(async () => {
    try {
      await clearSession?.();
    } catch {}
    try {
      await AsyncStorage.clear();
    } catch {}

    // ✅ hard reset to login so back button doesn't go back
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: "Root", params: { screen: "Login" } }],
      });
      return;
    } catch {}

    // fallback
    try {
      navigation.navigate("Root", { screen: "Login" });
    } catch {}
  }, [navigation]);

  const Item = ({ icon, label, onPress, color = "#fff" }) => (
    <TouchableOpacity
      style={s.row}
      activeOpacity={0.7}
      onPress={() => {
        try {
          onPress?.();
        } catch (e) {
          Alert.alert("Navigation error", e?.message || "Could not open screen");
        }
      }}
    >
      <View style={s.left}>{icon}</View>
      <Text style={[s.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <DrawerContentScrollView
        contentContainerStyle={s.drawer}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ Centered container to avoid full-stretch on wide screens */}
        <View style={s.container}>
          <TouchableOpacity
            onPress={() => navigation.closeDrawer()}
            style={s.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <Item
            icon={<Ionicons name="person-circle" size={20} color={blue} />}
            label="My Profile"
            onPress={() => goTab("Home")}
          />

          <Item
            icon={
              <MaterialCommunityIcons
                name="gamepad-variant"
                size={20}
                color={blue}
              />
            }
            label="My PlayGame"
            onPress={() => goTab("Play")}
          />

          <Item
            icon={<Ionicons name="wallet" size={20} color={blue} />}
            label="Commission"
            onPress={() => goRoot("Commission")}
          />

          <Item
            icon={<Ionicons name="time-outline" size={20} color={blue} />}
            label="Bet History"
            onPress={() => goRoot("BetHistory")}
          />

          <Item
            icon={<Ionicons name="newspaper-outline" size={20} color={blue} />}
            label="Result History"
            onPress={() => goRoot("ResultHistory")}
          />

          <Item
            icon={<Ionicons name="trophy-outline" size={20} color={blue} />}
            label="My Winnings"
            onPress={() => goRoot("Winnings")}
          />

          <Item
            icon={<Ionicons name="card-outline" size={20} color={blue} />}
            label="UPI Deposit"
            onPress={() => goRoot("Deposit")}
          />

          <Item
            icon={<Ionicons name="document-text-outline" size={20} color={blue} />}
            label="Statement"
            onPress={() => goRoot("Statement")}
          />

          <Item
            icon={<Ionicons name="help-circle-outline" size={20} color={blue} />}
            label="Help"
            onPress={() => goRoot("Help")}
          />

          <Item
            icon={<FontAwesome5 name="share-alt" size={18} color={blue} />}
            label="Share & Earn"
            onPress={() => goRoot("ShareEarn")}
          />

          <Item
            icon={
              <Ionicons name="document-attach-outline" size={20} color={blue} />
            }
            label="Terms & Conditions"
            onPress={() => goRoot("Terms")}
          />

          <View style={s.divider} />

          <Item
            icon={<Ionicons name="log-out-outline" size={20} color="#ff9c9c" />}
            label="Sign Out"
            color="#ff9c9c"
            onPress={logout}
          />
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.purple },

  drawer: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: THEME.purple,
    paddingHorizontal: 12,
  },

  container: {
    width: "100%",
    alignSelf: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  left: { width: 26, alignItems: "center", marginRight: 10 },

  text: { flex: 1, fontSize: 16, fontWeight: "600" },

  closeBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  divider: {
    height: 1,
    backgroundColor: THEME.pink,
    marginVertical: 10,
    marginHorizontal: 4,
    opacity: 0.9,
  },
});
