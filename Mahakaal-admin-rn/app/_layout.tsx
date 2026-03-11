// app/_layout.tsx
import "react-native-gesture-handler";
import "../lib/debugFetch";

import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "expo-router/drawer";
import { router, usePathname } from "expo-router";
import {
  Image,
  View,
  Pressable,
  Text,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DrawerToggleButton } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadTokensFromStorage,
  getAdminToken,
  persistAdminToken,
} from "../lib/api";
import { THEME } from "../lib/theme";
import { useAdminNotifications } from "../lib/useAdminNotifications";
import { LinearGradient } from "expo-linear-gradient";

const LOGO = require("../assets/icon-512.png");

const ADMIN_TOKEN_KEY = "ADMIN_TOKEN";
const ADMIN_USER_KEY = "ADMIN_USER";

export default function Layout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await loadTokensFromStorage();
        setAuthed(!!getAdminToken());
      } catch {
        setAuthed(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const t = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
        setAuthed(!!t || !!getAdminToken());
      } catch {
        setAuthed(!!getAdminToken());
      }
    })();
  }, [ready, pathname]);

  useEffect(() => {
    if (!ready) return;

    const isLogin = pathname === "/login";
    const isAuthedNow = !!getAdminToken() || authed;

    if (!isAuthedNow && !isLogin) {
      router.replace("/login");
      return;
    }
    if (isAuthedNow && isLogin) {
      router.replace("/");
    }
  }, [ready, pathname, authed]);

  const isAuthed = useMemo(() => !!getAdminToken() || authed, [authed]);

  useAdminNotifications(isAuthed);

  const onLogout = async () => {
    try {
      await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
      await AsyncStorage.removeItem(ADMIN_USER_KEY);
      await persistAdminToken(null);
      setAuthed(false);
      router.replace("/login");
    } catch {
      setAuthed(false);
      router.replace("/login");
    }
  };

  if (!ready) {
    return (
      <LinearGradient
        colors={THEME.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Image
          source={LOGO}
          style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 10 }}
        />
        <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>Loading…</Text>
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <Drawer
        key={isAuthed ? "authed" : "guest"}
        screenOptions={{
          headerShown: true,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: THEME.purple },
          headerTitleStyle: { fontWeight: "800", color: "#FFFFFF" },
          headerTintColor: "#FFFFFF",

          headerLeft: () =>
            isAuthed && !isDesktop ? (
              <DrawerToggleButton tintColor="#FFFFFF" />
            ) : null,

          swipeEnabled: isAuthed && !isDesktop,

          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isAuthed && (
                <Pressable
                  onPress={onLogout}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    marginRight: 6,
                    backgroundColor: "#ef4444",
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Logout
                  </Text>
                </Pressable>
              )}
              <Image
                source={LOGO}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginRight: 10,
                }}
              />
            </View>
          ),

          drawerType: isDesktop ? "permanent" : "front",

          drawerStyle: {
            width: isDesktop ? 280 : isTablet ? 260 : 240,
            backgroundColor: THEME.purple,
          },

          overlayColor: "rgba(0,0,0,0.45)",
          drawerActiveTintColor: "#FFFFFF",
          drawerActiveBackgroundColor: THEME.pink,
          drawerInactiveTintColor: "rgba(255,255,255,0.8)",
          drawerLabelStyle: { fontWeight: "700" },
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Admin Dashboard" }} />
        <Drawer.Screen name="users" options={{ title: "Users" }} />
        <Drawer.Screen name="referral-config" options={{ title: "Referral / Commission" }} />
        <Drawer.Screen name="payment-report" options={{ title: "Payment Report" }} />
        <Drawer.Screen name="payment-requests" options={{ title: "Payment Requests" }} />
        <Drawer.Screen name="deposits" options={{ title: "UPI Deposits" }} />
        <Drawer.Screen name="scanner" options={{ title: "Deposit QR" }} />
        <Drawer.Screen name="games-history" options={{ title: "Games History" }} />
        <Drawer.Screen name="results" options={{ title: "Results" }} />
        <Drawer.Screen name="wins" options={{ title: "Wins" }} />
        <Drawer.Screen name="bet-report" options={{ title: "Bet Report" }} />
        <Drawer.Screen name="combined-show" options={{ title: "Combined Show" }} />

        <Drawer.Screen
          name="login"
          options={{
            title: "Login",
            headerShown: false,
            drawerItemStyle: { display: "none" },
            swipeEnabled: false,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}