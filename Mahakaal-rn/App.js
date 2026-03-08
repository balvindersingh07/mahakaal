// App.js
import "react-native-gesture-handler";
import React, { useEffect, useState, useMemo } from "react";
import { View, Platform, StyleSheet, StatusBar, useWindowDimensions, TouchableOpacity } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator, useDrawerStatus } from "@react-navigation/drawer";

import { WalletProvider } from "./src/context/WalletContext";

import * as SplashScreen from "expo-splash-screen";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

import { THEME } from "./src/theme";

/* Screens */
import SplashUI from "./src/screens/SplashScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/screens/MainTabs";

// ✅ adjust paths as per your folder names
import CommissionScreen from "./src/screens/commission/CommissionScreen";
import BetHistoryScreen from "./src/screens/history/BetHistoryScreen";
import ResultHistoryScreen from "./src/screens/results/ResultHistoryScreen";
import WinningsScreen from "./src/screens/winnings/WinningsScreen";
import TxnStatusScreen from "./src/screens/status/TxnStatusScreen";
import AddScannerScreen from "./src/screens/scanner/AddScannerScreen";
import StatementScreen from "./src/screens/statement/StatementScreen";
import HelpScreen from "./src/screens/help/HelpScreen";

// ⚠️ You used ./src/screens/share/ShareEarnScreen but earlier file is /referral/
// If your folder is referral, keep referral import. If it's share, rename accordingly.
import ShareEarnScreen from "./src/screens/share/ShareEarnScreen";

import TermsScreen from "./src/screens/terms/TermsScreen";

/* Drawer content */
import MenuDrawer from "./src/screens/menu/MenuDrawer";

const APP_BG = THEME.bg;
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Max content width for tablets/wide screens
const MAX_WIDTH = 480;

/** Keep native splash until navigation is ready */
if (Platform.OS !== "web") {
  try {
    SplashScreen.preventAutoHideAsync();
  } catch {}
}

/* ----- Navigation theme ----- */
const AppTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: APP_BG },
};

/* ----- Deep linking - simplified for web compatibility ----- */
const linking = Platform.OS === "web"
  ? undefined
  : {
      prefixes: ["mahakaal://", "https://mahakaal.app", "https://www.mahakaal.app"],
      config: {
        screens: {
          Root: {
            path: "",
            screens: {
              Splash: "",
              Register: "register",
              Login: "login",
              MainTabs: "app",
              Commission: "commission",
              BetHistory: "history/bets",
              ResultHistory: "history/results",
              Winnings: "winnings",
              TxnStatus: "status",
              AddScanner: "add-scanner",
              Statement: "statement",
              Help: "help",
              ShareEarn: "share",
              Terms: "terms",
            },
          },
        },
      },
    };

// Global frame - responsive for different screen sizes
function ScreenFrame({ children }) {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 24, MAX_WIDTH);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={THEME.bg}
        translucent={false}
      />
      <View style={styles.centerOuter}>
        <View style={[styles.centerInner, { maxWidth: maxW }]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

/* ✅ Root screen must be a navigator (Stack) so MenuDrawer can navigate:
   navigation.navigate("Root", { screen: "BetHistory" })
*/
function RootNavigatorScreen() {
  const opened = useDrawerStatus() === "open";

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScreenFrame>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={({ navigation }) => ({
            headerShown: true,
            headerLeft: () =>
              navigation.canGoBack() ? (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ padding: 12, marginLeft: 4 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={26} color="#111827" />
                </TouchableOpacity>
              ) : null,
            headerTitle: "",
            headerStyle: { backgroundColor: THEME.bg },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: THEME.bg },
          })}
        >
          <Stack.Screen name="Splash" component={SplashUI} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

          {/* Drawer menu targets - headerShown: false to avoid double back arrows (screens handle their own back) */}
          <Stack.Screen name="Commission" component={CommissionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="BetHistory" component={BetHistoryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResultHistory" component={ResultHistoryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Winnings" component={WinningsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TxnStatus" component={TxnStatusScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddScanner" component={AddScannerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Statement" component={StatementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ShareEarn" component={ShareEarnScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>

        {/* Blur overlay when drawer is open */}
        {opened && (
          <>
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.08)" },
              ]}
            />
            <BlurView
              pointerEvents="none"
              intensity={24}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
      </ScreenFrame>
    </View>
  );
}

export default function App() {
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    if (navReady && Platform.OS !== "web") {
      (async () => {
        try {
          await SplashScreen.hideAsync();
        } catch {}
      })();
    }
  }, [navReady]);

  // ✅ avoid recreating objects every render
  const { width } = useWindowDimensions();
  const drawerWidth = width ? Math.min(Math.max(width * 0.78, 240), 320) : 260;

  const drawerScreenOptions = useMemo(
    () => ({
      headerShown: false,
      drawerType: "front",
      drawerStyle: { width: drawerWidth, backgroundColor: THEME.purple },
      overlayColor: "transparent",
      sceneContainerStyle: { backgroundColor: THEME.bg },
      swipeEdgeWidth: 40,
    }),
    [drawerWidth]
  );

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <WalletProvider>
        <NavigationContainer
          theme={AppTheme}
          linking={linking}
          onReady={() => setNavReady(true)}
          fallback={<View style={{ flex: 1, backgroundColor: THEME.bg }} />}
        >
          <Drawer.Navigator
            screenOptions={drawerScreenOptions}
            drawerContent={(props) => <MenuDrawer {...props} />}
          >
            <Drawer.Screen name="Root" component={RootNavigatorScreen} />
          </Drawer.Navigator>
        </NavigationContainer>
        </WalletProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  centerOuter: { flex: 1, alignItems: "center" },
  centerInner: { flex: 1, width: "100%" },
});
