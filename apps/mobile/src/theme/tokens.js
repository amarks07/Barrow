// Same values as apps/web/app/globals.css and this app's global.css —
// duplicated here as plain hex for call sites that need a raw color value
// instead of a nativewind className (SVG strokes, navigation themes,
// StatusBar style, icon `color` props).
export const THEME_TOKENS = {
  dark: {
    bg: "#d1d1e6",
    surface: "#0C0C0E",
    header: "#1E1E22",
    text: "#F5F3EE",
    textDim: "#918F89",
    accent: "#FF5A36",
    accentDeep: "#B23F22",
    line: "#2C2B28",
    lineStrong: "#6E6D67",
    danger: "#D8322F",
    onAccent: "#121214",
  },
  light: {
    bg: "#F0EDE6",
    surface: "#FFFFFF",
    header: "#EAE6DC",
    text: "#1A1A1C",
    textDim: "#6B6963",
    accent: "#FF5A36",
    accentDeep: "#B23F22",
    line: "#E4E0D6",
    lineStrong: "#8A8577",
    danger: "#D8322F",
    onAccent: "#121214",
  },
};
