import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { THEME } from "../theme";
import HomeStack from "./home/HomeStack";
import PlayStack from "../navigation/PlayStack";
import WalletStack from "../navigation/WalletStack";

const Tab = createBottomTabNavigator();
function Dummy() { return null; }

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottom = Number(insets?.bottom) || 0;
  const tabHeight = 56 + bottom;

  return (
    <>
      <StatusBar
        translucent={false}
        backgroundColor={THEME.purple}
        barStyle="light-content"
      />
      <Tab.Navigator
        initialRouteName="Home"
        sceneContainerStyle={{ backgroundColor: THEME.bg }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,

          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "rgba(255,255,255,0.7)",
          tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },

          tabBarBackground: () => (
            <LinearGradient
              colors={THEME.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          ),
          tabBarStyle: {
            height: tabHeight,
            paddingBottom: bottom || 8,
            paddingTop: 6,
            borderTopWidth: 0,
            elevation: 12,
            backgroundColor: "transparent",
          },

          tabBarIcon: ({ color, size }) => {
            if (route.name === "Home")
              return <Ionicons name="home" size={size} color={color} />;
            if (route.name === "Play")
              return <MaterialCommunityIcons name="gamepad-variant" size={size} color={color} />;
            if (route.name === "Wallet")
              return <Ionicons name="wallet" size={size} color={color} />;
            if (route.name === "Menu")
              return <MaterialIcons name="menu" size={size} color={color} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Play" component={PlayStack} />
        <Tab.Screen name="Wallet" component={WalletStack} />

        <Tab.Screen
          name="Menu"
          component={Dummy}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              // ✅ drawer open (robust)
              const parent1 = navigation.getParent?.();          // Tabs parent
              const parent2 = parent1?.getParent?.();            // Drawer parent
              parent2?.openDrawer?.();
            },
          })}
        />
      </Tab.Navigator>
    </>
  );
}
