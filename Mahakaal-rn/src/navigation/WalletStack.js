// src/navigation/WalletStack.js
import React from "react";
import { TouchableOpacity } from "react-native";
import { THEME } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WalletScreen from "../screens/wallet/WalletScreen";
import WithdrawScreen from "../screens/wallet/WithdrawScreen";
import MyRequestsScreen from "../screens/wallet/MyRequestsScreen";

const Stack = createNativeStackNavigator();

export default function WalletStack() {
  return (
    <Stack.Navigator
      initialRouteName="WalletHome"
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
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        detachPreviousScreen: true,
      })}
    >
      <Stack.Screen name="WalletHome" component={WalletScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
    </Stack.Navigator>
  );
}
