// Selectable accent colors — independent of light/dark theme (same hex in
// both, same as the original hardcoded accent/accentDeep in tokens.js) so
// picking one doesn't require a separate light/dark variant of each color.
// Every option was picked bright enough that the app's existing hardcoded
// "#121214" on-accent text/icon color (Button, FAB, Check marks, tab labels,
// etc. — none of which read tokens.onAccent) keeps working without also
// having to touch every one of those call sites.
export const ACCENT_PALETTE = [
  { value: "orange", label: "Orange", accent: "#FF5A36", accentDeep: "#B23F22" },
  { value: "amber", label: "Amber", accent: "#FFB020", accentDeep: "#B37B16" },
  { value: "yellow", label: "Yellow", accent: "#FFD23D", accentDeep: "#B8952A" },
  { value: "lime", label: "Lime", accent: "#A3E635", accentDeep: "#729425" },
  { value: "green", label: "Green", accent: "#34C77B", accentDeep: "#228A54" },
  { value: "teal", label: "Teal", accent: "#2DD4C7", accentDeep: "#1F948B" },
  { value: "blue", label: "Blue", accent: "#3DA9FC", accentDeep: "#2778B0" },
  { value: "indigo", label: "Indigo", accent: "#7C86FF", accentDeep: "#565EB3" },
  { value: "violet", label: "Violet", accent: "#C084FC", accentDeep: "#8A5CB0" },
  { value: "pink", label: "Pink", accent: "#FF5C8A", accentDeep: "#B23F60" },
  { value: "coral", label: "Coral", accent: "#FF6B6B", accentDeep: "#B34A4A" },
];

export const DEFAULT_ACCENT = "orange";

// Overlays the selected accent color's `accent`/`accentDeep` onto an
// already-resolved (light or dark) token set. Shared by the in-app
// ThemeProvider and the headless widget context so both apply an
// unrecognized/missing accent value the same way (falls back to the
// default rather than leaving the theme's own accent in place).
export function applyAccent(tokens, accentValue) {
  const palette = ACCENT_PALETTE.find((p) => p.value === accentValue) || ACCENT_PALETTE.find((p) => p.value === DEFAULT_ACCENT);
  return { ...tokens, accent: palette.accent, accentDeep: palette.accentDeep };
}
