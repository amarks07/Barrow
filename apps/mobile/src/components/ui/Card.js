import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

// RN has no `box-shadow: inset`, so the web app's ".card" sunken-panel look
// (inset 2px 2px 5px rgba(0,0,0,0.55) + inset highlight) is approximated
// with a plain dark border instead of a literal inset shadow.
export function Card({ style, children, selected, ...props }) {
  const { tokens } = useTheme();
  return (
    <View
      className="rounded-[10px]"
      style={[
        { backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: selected ? undefined : "rgba(0,0,0,0.3)" },
        selected && { borderColor: "#FF5A36" },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
