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

  // Horizontal padding (16 each side)
  const hPad = 16;
  const contentWidth = Math.max(280, width - hPad * 2);

  // Max content width - prevents over-stretch on tablets
  const maxContentWidth = Math.min(contentWidth, 560);

  // Responsive scale factor (1 on 375px, smaller on tiny screens)
  const scale = Math.max(0.85, Math.min(1.1, width / 375));

  // Use wrap layout for chips/tabs when screen is narrow (all buttons visible)
  const useChipWrap = width < 380;

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    maxContentWidth,
    contentWidth,
    scale,
    useChipWrap,
  };
}
