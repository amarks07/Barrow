import { createContext, useContext, useMemo } from "react";
import { View } from "react-native";
import { THEME_TOKENS } from "./tokens";

const ThemeContext = createContext(null);

// Theme is driven by the persisted preference (AppStateProvider), not the OS
// color scheme. Every themed color throughout the app reads `tokens.*` from
// this context and applies it as a plain inline style — not a Nativewind
// className swap. An earlier version toggled a root-level `.light` class
// that flipped CSS variables for every descendant's `bg-bg`/`text-text-dim`/
// etc. classes at once; on Android that forced Nativewind to re-resolve the
// entire mounted tree's worth of CSS-variable-backed styles synchronously on
// every toggle, which is what froze the app when switching to light mode.
// Plain style objects sidestep that entirely (same fix pattern as the
// square-corners remount issue elsewhere in this app).
export function ThemeProvider({ theme, children }) {
  const tokens = THEME_TOKENS[theme] ?? THEME_TOKENS.dark;
  const value = useMemo(() => ({ theme, tokens }), [theme, tokens]);
  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
