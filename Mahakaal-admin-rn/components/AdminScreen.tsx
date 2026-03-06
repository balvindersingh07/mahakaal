// components/AdminScreen.tsx
import React, { ReactNode } from "react";
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { THEME } from "../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

const GANESH = require("../assets/ganesh.png");

type Props = { children?: ReactNode; showBg?: boolean };

export default function AdminScreen({ children, showBg = false }: Props) {
  const insets = useSafeAreaInsets();
  const headerH = useHeaderHeight ? useHeaderHeight() : 0;
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1200;
  const isTablet = width >= 768 && width < 1200;

  const paddingTop = headerH + Math.max(insets.top, 0) + 12;

  // Responsive container width
  const maxWidth = isDesktop ? 1200 : isTablet ? 900 : "100%";

  return (
    <View style={s.container}>
      {showBg ? (
        <>
          <Image
            source={GANESH}
            style={s.bg}
            resizeMode="cover"
            pointerEvents="none"
          />
          <View style={s.tint} pointerEvents="none" />
        </>
      ) : null}

      <View style={[s.outerContent, { paddingTop }]}>
        <View style={[s.innerContent, { maxWidth }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  bg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },

  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  // Outer wrapper (centers content on large screens)
  outerContent: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  // Actual content container
  innerContent: {
    width: "100%",
  },
});