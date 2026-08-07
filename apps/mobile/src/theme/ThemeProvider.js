import { createContext, useContext, useMemo } from "react";
import { View, useColorScheme } from "react-native";
import { THEME_TOKENS } from "./tokens";
import { resolveTheme } from "./resolveTheme";
import { applyAccent, DEFAULT_ACCENT } from "./accentPalette";

const ThemeContext = createContext(null);

// Theme is driven by the persisted preference (AppStateProvider) — "dark",
// "light", or "system", in which case this falls back to the OS color
// scheme via useColorScheme(). `accent` is a separate persisted preference
// (see accentPalette.js) layered on top of whichever light/dark token set
// wins — same accent color either way. Every themed color throughout the
// app reads `tokens.*` from this context and applies it as a plain inline
// style — not a Nativewind className swap. An earlier version toggled a
// root-level `.light` class that flipped CSS variables for every
// descendant's `bg-bg`/`text-text-dim`/etc. classes at once; on Android that
// forced Nativewind to re-resolve the entire mounted tree's worth of
// CSS-variable-backed styles synchronously on every toggle, which is what
// froze the app when switching to light mode. Plain style objects sidestep
// that entirely (same fix pattern as the square-corners remount issue
// elsewhere in this app).
export function ThemeProvider({ theme, accent = DEFAULT_ACCENT, children }) {
  const systemScheme = useColorScheme();
  const resolved = resolveTheme(theme, systemScheme);
  const tokens = useMemo(() => applyAccent(THEME_TOKENS[resolved], accent), [resolved, accent]);
  const value = useMemo(() => ({ theme: resolved, tokens }), [resolved, tokens]);
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
