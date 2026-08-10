import { useState } from "react";
import { Animated, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

const RIPPLE_BASE_SIZE = 16;
const RIPPLE_PEAK_OPACITY = 0.4;

// RN has no `box-shadow: inset`, so the web app's ".card" sunken-panel look
// (inset 2px 2px 5px rgba(0,0,0,0.55) + inset highlight) is approximated
// with a plain dark border instead of a literal inset shadow.
//
// `pulse` (optional, from usePulse) fires a Material-style ripple from the
// card's center — a circle that grows to cover the card while fading out —
// tap feedback for cards whose whole area is pressable but whose content (a
// switch, a picker) doesn't otherwise show a press state.
export function Card({ style, children, selected, pulse, ...props }) {
  const { tokens } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const targetDiameter = Math.sqrt(size.width ** 2 + size.height ** 2);
  const targetScale = Math.max(targetDiameter / RIPPLE_BASE_SIZE, 1);

  const rippleStyle = pulse && {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, targetScale] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, RIPPLE_PEAK_OPACITY, 0] }),
  };

  return (
    <View
      className="rounded-[10px]"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      style={[
        { backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: selected ? tokens.accent : "rgba(0,0,0,0.3)", overflow: "hidden" },
        style,
      ]}
      {...props}
    >
      {pulse && size.width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: "50%",
              left: "50%",
              width: RIPPLE_BASE_SIZE,
              height: RIPPLE_BASE_SIZE,
              marginLeft: -RIPPLE_BASE_SIZE / 2,
              marginTop: -RIPPLE_BASE_SIZE / 2,
              borderRadius: RIPPLE_BASE_SIZE / 2,
              backgroundColor: tokens.accent,
            },
            rippleStyle,
          ]}
        />
      )}
      {children}
    </View>
  );
}
