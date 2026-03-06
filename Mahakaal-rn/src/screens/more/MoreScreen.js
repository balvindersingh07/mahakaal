import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { THEME } from "../../theme";

export default function MoreScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ Centered container to avoid full-stretch on wide screens */}
        <View style={s.container}>
          <Text style={s.title}>Menu</Text>

          <TouchableOpacity
            style={s.item}
            onPress={() => navigation.navigate("Wallet")}
            activeOpacity={0.75}
          >
            <Ionicons name="wallet-outline" size={20} color="#111827" />
            <Text style={s.txt} numberOfLines={1}>
              Wallet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.item}
            onPress={() => navigation.navigate("Play")}
            activeOpacity={0.75}
          >
            <Ionicons name="game-controller-outline" size={20} color="#111827" />
            <Text style={s.txt} numberOfLines={1}>
              Play
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.item, s.lastItem]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="close-outline" size={20} color="#111827" />
            <Text style={s.txt} numberOfLines={1}>
              Close Menu
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  scroll: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // ✅ stable width on tablet/web, still responsive on phone
  container: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },

  // optional: last item without extra line if you want it cleaner
  lastItem: {
    borderBottomWidth: 0,
    marginTop: 4,
  },

  txt: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
});
