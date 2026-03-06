// Mahakaal theme — Purple, Pink, Orange gradient
export const THEME = {
  purple: "#6C2BD9",
  pink: "#EC4899",
  orange: "#F97316",
  gradient: ["#6C2BD9", "#EC4899", "#F97316"] as const,
  primary: "#6C2BD9",
  bg: "#f8f5ff",
  card: "#FFFFFF",
  white: "#FFFFFF",
  textDark: "#111827",
  textLight: "#FFFFFF",
  textMuted: "#6b7280",
  success: "#22c55e",
  danger: "#ef4444",
  border: "#e5e7eb",
};

// Legacy WA alias for compatibility
export const WA = {
  dark: THEME.primary,
  mid: THEME.pink,
  light: THEME.orange,
  tint: "#fce7f3",
  bg: THEME.bg,
  white: THEME.white,
  card: THEME.card,
  textDark: THEME.textDark,
  textLight: THEME.textLight,
  textMuted: THEME.textMuted,
  red: THEME.danger,
  border: THEME.border,
  shadow: THEME.primary,
};
