import { Pressable, View } from "react-native";
import { Hand } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { BUTTON_HEIGHT } from "../../theme/dimensions";

// "Together" is a pair of hands (one flipped horizontally to face the
// other, as if clasped); "separate" is a single hand tracked on its own.
const OPTIONS = [
  { value: "together", hands: 2, label: "Together" },
  { value: "separate", hands: 1, label: "Track sides separately" },
];

// Inline two-option switch for whether a set is performed together (one
// shared rep count) or with each side tracked separately (see
// SplitRepsRow). An always-visible segmented pill, same shape as
// AngleToggle, rather than the dropdown-of-three this used to be for
// left/both/right — that dropdown existed to avoid crowding this row with
// three segments; with only two options a pill fits inline fine.
export function SideToggle({ value, onChange }) {
  const { tokens } = useTheme();
  return (
    <View
      className="flex-row items-center p-1 rounded-full"
      style={{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            // Keyed on active too, not just opt.value — see AngleToggle's
            // matching comment for why a stable style object alone isn't
            // enough here.
            key={`${opt.value}-${active}`}
            onPress={() => onChange(opt.value)}
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            className="items-center justify-center"
            style={{
              width: BUTTON_HEIGHT.small,
              height: BUTTON_HEIGHT.small,
              borderRadius: 999,
              backgroundColor: active ? tokens.accent : "transparent",
            }}
          >
            {opt.hands === 2 ? (
              <View style={{ flexDirection: "row", gap: 2 }}>
                {/* Transform lives on a wrapping View, not the Hand's own
                    style prop — lucide's Icon spreads `style` onto every
                    internal SVG path, so a transform passed directly to
                    Hand distorts each path individually instead of
                    flipping the icon as a whole. */}
                <View style={{ transform: [{ scaleX: -1 }] }}>
                  <Hand size={12} color={active ? "#121214" : tokens.textDim} />
                </View>
                <Hand size={12} color={active ? "#121214" : tokens.textDim} />
              </View>
            ) : (
              <Hand size={14} color={active ? "#121214" : tokens.textDim} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
