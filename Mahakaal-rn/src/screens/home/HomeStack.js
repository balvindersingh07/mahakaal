import React from "react";
import { TouchableOpacity } from "react-native";
import { THEME } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import ChangePasswordScreen from "./ChangePasswordScreen";
import ResultHistoryScreen from "../results/ResultHistoryScreen";

const S = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <S.Navigator
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
      <S.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <S.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <S.Screen name="ResultHistory" component={ResultHistoryScreen} options={{ headerShown: false }} />
    </S.Navigator>
  );
}
