import { Pressable, View } from "react-native";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { BUTTON_HEIGHT } from "../../theme/dimensions";

const ICONS = { Flat: Minus, Incline: ArrowUpRight, Decline: ArrowDownRight };

// Compact icon-only bench angle switch — sized to match Button's "small"
// (not the taller SWITCH_HEIGHT family) since it sits alongside small
// buttons in these rows, and always right-aligned regardless of what the
// caller's own alignment happens to be.
export function AngleToggle({ value, options, onChange }) {
  const { tokens } = useTheme();
  return (
    <View
      className="flex-row items-center p-1 rounded-full"
      style={{ alignSelf: "flex-end", backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = ICONS[opt.value] || Minus;
        return (
          <Pressable
            // Keyed on active too, not just opt.value: a stable style
            // object (borderRadius always present) still wasn't enough —
            // see Button.js for why the key needs to change too.
            key={`${opt.value}-${active}`}
            onPress={() => onChange(opt.value)}
            accessibilityLabel={opt.value}
            accessibilityState={{ selected: active }}
            className="items-center justify-center"
            style={{
              width: BUTTON_HEIGHT.small,
              height: BUTTON_HEIGHT.small,
              borderRadius: 999,
              backgroundColor: active ? tokens.accent : "transparent",
            }}
          >
            <Icon size={14} color={active ? "#121214" : tokens.textDim} />
          </Pressable>
        );
      })}
    </View>
  );
}
