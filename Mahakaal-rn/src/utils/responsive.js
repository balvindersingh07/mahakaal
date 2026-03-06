// src/utils/responsive.js
// Responsive layout helpers for different mobile screen sizes
import { useWindowDimensions } from "react-native";

/**
 * Breakpoints (width in px):
 * - small: < 375 (e.g. iPhone SE, small Android)
 * - medium: 375-414 (standard phones)
 * - large: 414+ (plus phones, tablets)
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < 375;
  const isMedium = width >= 375 && width < 414;
  const isLarge = width >= 414;

  // Max content width - prevents over-stretch on tablets
  const maxContentWidth = Math.min(width - 32, 480);

  // Responsive scale factor (1 on 375px, smaller on tiny screens)
  const scale = Math.max(0.85, Math.min(1.1, width / 375));

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    maxContentWidth,
    scale,
  };
}
