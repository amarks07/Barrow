// Themed colors (bg/surface/text/accent/line/etc.) are intentionally NOT
// defined here as Tailwind classes. They used to be CSS variables flipped by
// a root-level `.light` className (see git history / ThemeProvider.js), but
// toggling that class forced Nativewind to re-resolve every CSS-variable-
// backed style in the whole mounted tree at once, which froze the app on
// Android when switching themes. Every themed color now comes from
// useTheme().tokens as a plain inline style instead — see src/theme/tokens.js.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
