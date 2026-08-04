import { Pressable, Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { BUTTON_FONT_SIZE, BUTTON_HEIGHT, BUTTON_PADDING_H } from "../../theme/dimensions";
import { FONT_DISPLAY } from "../../theme/fonts";

// Standard action button, used for everything from "History"/"Swap"/"Save
// as template" up through modal "Cancel"/"Save" buttons and the app's
// prominent CTAs. Two sizes only: `small` (the default — matches what the
// Day view's action row already looked like) and `large` (reserved for a
// screen's one standout CTA, like Calendar's "Start a workout").
//
// variant:
//   "outline"       — surface background, border, dim label (History, Swap,
//                      Cancel, Create superset — the common neutral case)
//   "solid"         — accent background, dark label, thicker border (Save,
//                      Start a workout — the affirmative/primary case)
//   "accentOutline" — same shape as outline, but an accent-colored label
//                      (+ Add exercise in template detail)
export function Button({
  label,
  onPress,
  size = "small",
  variant = "outline",
  disabled = false,
  fullWidth = false,
  icon,
  trailingIcon,
  style,
  textStyle,
}) {
  const { tokens } = useTheme();
  const solid = variant === "solid" && !disabled;

  const labelColor = solid ? "#121214" : variant === "accentOutline" ? tokens.accent : tokens.textDim;

  return (
    <Pressable
      // Keyed on the props that drive backgroundColor: even with a stable
      // style object (borderRadius always present, only backgroundColor
      // varies), the view could still render square right after solid/
      // disabled changed — Android's native view update appears to
      // sometimes drop the rounded-corner drawable when only
      // backgroundColor is patched on an already-mounted view. Changing
      // the key forces React to unmount and recreate the native view from
      // scratch instead of patching it, so it's built correctly (rounded)
      // from the start.
      key={`${variant}-${disabled}`}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          height: BUTTON_HEIGHT[size],
          paddingHorizontal: BUTTON_PADDING_H[size],
          borderRadius: 999,
          borderWidth: variant === "solid" ? 2 : 1.5,
          borderColor: variant === "solid" ? "rgba(0,0,0,0.3)" : tokens.lineStrong,
          backgroundColor: solid ? tokens.accent : tokens.surface,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 6,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {icon}
      <Text
        // Bebas Neue's line-height metrics run much taller than its
        // cap-height, so lineHeight alone isn't enough — Android also pads
        // Text based on the font's internal ascent/descent unless
        // includeFontPadding is turned off (same fix as the chip labels).
        style={[
          {
            fontFamily: FONT_DISPLAY,
            fontSize: BUTTON_FONT_SIZE[size],
            lineHeight: BUTTON_FONT_SIZE[size],
            textTransform: "uppercase",
            includeFontPadding: false,
            textAlignVertical: "center",
            color: labelColor,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
      {trailingIcon}
    </Pressable>
  );
}
