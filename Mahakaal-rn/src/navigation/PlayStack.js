// src/navigation/PlayStack.js
import React from "react";
import { TouchableOpacity } from "react-native";
import { THEME } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BetCartProvider } from "../context/BetCartContext";

import PlayScreen from "../screens/play/PlayScreen";
import GamePlay from "../screens/play/GamePlay";
import Crossing from "../screens/play/Crossing"; // ✅ correct path (Crossing.js)
import NoToNo from "../screens/play/NoToNo";

const Stack = createNativeStackNavigator();

export default function PlayStack() {
  return (
    <BetCartProvider>
    <Stack.Navigator
      initialRouteName="PlayScreen"
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
      <Stack.Screen name="PlayScreen" component={PlayScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GamePlay" component={GamePlay} />
      <Stack.Screen name="Crossing" component={Crossing} />
      <Stack.Screen name="NoToNo" component={NoToNo} />
    </Stack.Navigator>
    </BetCartProvider>
  );
}
