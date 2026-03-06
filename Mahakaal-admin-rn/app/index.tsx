import React from "react";
import { View, Image, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { THEME } from "../lib/theme";

const GANESH = require("../assets/ganesh.png");
const MAX_IMAGE = 1200;

export default function Index() {
  const { width, height } = useWindowDimensions();
  const maxW = Math.min(width, MAX_IMAGE);
  const maxH = Math.min(height, MAX_IMAGE);

  return (
    <LinearGradient colors={THEME.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <Image
        source={GANESH}
        style={[styles.image, { maxWidth: maxW, maxHeight: maxH }]}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
