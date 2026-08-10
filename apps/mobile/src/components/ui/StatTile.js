import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Small surface-colored box: uppercase label, one big tabular-nums value,
// optional sublabel underneath. Used wherever a screen wants a row of
// at-a-glance numbers (History's PR tiles, the workout summary's stat
// grid) — pass `style={{ flex: undefined, width: ... }}` to opt out of the
// default flex-1 (equal-width-in-a-row) sizing.
export function StatTile({ label, value, sublabel, style }) {
  const { tokens } = useTheme();
  return (
    <View
      className="flex-1 rounded-[10px] px-3 py-2.5"
      style={[{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.line }, style]}
    >
      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 10, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "600", color: tokens.text, fontVariant: ["tabular-nums"] }}>{value}</Text>
      {sublabel && <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 2 }}>{sublabel}</Text>}
    </View>
  );
}
