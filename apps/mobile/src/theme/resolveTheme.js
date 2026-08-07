// Shared by the in-app ThemeProvider (via useColorScheme) and the headless
// widget context (via Appearance.getColorScheme(), the imperative
// equivalent) so both resolve "barrow:theme" to an actual light/dark theme
// the exact same way. `systemScheme` is whatever either of those return —
// "light", "dark", or null/undefined if the OS hasn't reported one yet.
export function resolveTheme(preference, systemScheme) {
  if (preference === "system") return systemScheme === "light" ? "light" : "dark";
  return preference === "light" ? "light" : "dark";
}
