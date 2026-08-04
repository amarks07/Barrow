import { Pressable, Text, View } from "react-native";
import { FONT_DISPLAY } from "../../theme/fonts";
import { SWITCH_HEIGHT } from "../../theme/dimensions";
import { useTheme } from "../../theme/ThemeProvider";

// Every usage of this in the app is a 2-option toggle (unit, theme,
// exercise-view, superset-grouping), so the whole control is one tap
// target that flips to the other option — tapping the already-active side,
// or the padding between the two, used to be a no-op; now anywhere you tap
// moves to the next option (wrapping around, so with exactly 2 options
// that's always "the opposite one").
export function ColorSwitch({ value, options, onChange }) {
  const { tokens } = useTheme();
  const activeIndex = Math.max(0, options.findIndex((opt) => opt.value === value));

  const toggle = () => {
    const next = options[(activeIndex + 1) % options.length];
    onChange(next.value);
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: activeIndex === options.length - 1 }}
      className="flex-row items-center self-start p-1 rounded-full"
      style={{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <View
            // Keyed on active state too, not just opt.value: even with a
            // stable style object (borderRadius always present, only
            // backgroundColor varies), the newly-active option still
            // rendered square right after a tap — Android's native view
            // update appears to sometimes drop the rounded-corner drawable
            // when only backgroundColor is patched on an already-mounted
            // view. Changing the key forces React to unmount and recreate
            // the native view from scratch instead of patching it in
            // place, so it's built correctly (rounded) from the start.
            key={`${opt.value}-${active}`}
            style={{
              height: SWITCH_HEIGHT,
              paddingHorizontal: 14,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              backgroundColor: active ? tokens.accent : "transparent",
            }}
          >
            <Text
              // Bebas Neue's line-height metrics run much taller than its
              // cap-height — pin lineHeight, and turn off Android's extra
              // ascent/descent padding, or the pill balloons past this.
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 15,
                lineHeight: 15,
                textTransform: "uppercase",
                includeFontPadding: false,
                textAlignVertical: "center",
                color: active ? "#121214" : tokens.textDim,
              }}
            >
              {opt.label}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}
