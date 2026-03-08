// src/screens/SplashScreen.js
// Phase 1: 10 sec splash with 3D logo effect
// Phase 2: Welcome card (Get Started / Login)
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  useWindowDimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { THEME } from "../theme";

const SPLASH_DURATION_MS = 3000; // 3 seconds
const TOP = Platform.select({
  ios: 8,
  android: (StatusBar.currentHeight || 0) + 8,
  default: 12,
});

export default function SplashScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(width - 36, 420);
  const [phase, setPhase] = useState("splash"); // "splash" | "welcome"

  // 3D effect animations
  const rotateY = useRef(new Animated.Value(0)).current;
  const rotateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const shadowOpacity = useRef(new Animated.Value(0.4)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 3D loop: subtle Y rotation + scale pulse
    const loop3D = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rotateY, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(shadowOpacity, {
            toValue: 0.7,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(rotateY, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(shadowOpacity, {
            toValue: 0.4,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished) loop3D();
      });
    };
    loop3D();

    // Slight X tilt for depth
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateX, {
          toValue: 0.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateX, {
          toValue: -0.05,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true }
    ).start();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("welcome");
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const rotateYInterp = rotateY.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "15deg"],
  });
  const rotateXInterp = rotateX.interpolate({
    inputRange: [-0.05, 0.05],
    outputRange: ["-6deg", "6deg"],
  });

  if (phase === "splash") {
    return (
      <LinearGradient colors={THEME.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={s.splashWrap}>
          <View style={s.logoContainer}>
            {/* 3D shadow layer */}
            <Animated.View
              style={[
                s.logoShadow,
                {
                  opacity: shadowOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                s.logo3d,
                {
                  transform: [
                    { perspective: 1200 },
                    { rotateY: rotateYInterp },
                    { rotateX: rotateXInterp },
                    { scale },
                  ],
                },
              ]}
            >
              <Image source={require("../../assets/icon-512.png")} style={s.splashLogo} />
            </Animated.View>
          </View>
          <Text style={s.splashBrand}>MAHAKAAL</Text>
          <Text style={s.splashSub}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={THEME.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.safe}>
      <SafeAreaView style={s.safeInner}>
        <Animated.View style={[s.wrap, { opacity: welcomeOpacity }]}>
          <View style={[s.card, { maxWidth: cardMaxW }]}>
            <Image source={require("../../assets/icon-512.png")} style={s.logo} />

            <Text style={s.title}>
              Welcome to <Text style={s.brand}>MAHAKAAL</Text>
            </Text>

            <Text style={s.sub}>Let's begin your journey</Text>

            <TouchableOpacity
              style={s.cta}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={s.ctaText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondary}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={s.secondaryText}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingTop: TOP },
  safeInner: { flex: 1, backgroundColor: "transparent" },
  splashWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoContainer: {
    position: "relative",
    marginBottom: 24,
  },
  logoShadow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0,0,0,0.35)",
    bottom: -12,
    alignSelf: "center",
  },
  logo3d: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    shadowOpacity: 0.5,
    elevation: 20,
  },
  splashLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 66,
  },
  splashBrand: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
  },
  splashSub: {
    marginTop: 12,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  wrap: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 22,
    shadowColor: THEME.purple,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignSelf: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: THEME.pink,
  },
  title: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  brand: { color: THEME.purple, fontWeight: "900" },
  sub: {
    textAlign: "center",
    fontSize: 16,
    color: "#5b6777",
    marginBottom: 22,
  },
  cta: {
    backgroundColor: THEME.purple,
    borderRadius: 28,
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 26,
    minWidth: 200,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
    fontSize: 18,
  },
  secondary: { marginTop: 14, alignSelf: "center" },
  secondaryText: { color: THEME.pink, fontWeight: "800" },
});
