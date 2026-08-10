import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import { TOGGLE_HEIGHT, TOGGLE_PADDING, TOGGLE_THUMB, TOGGLE_WIDTH } from "../../theme/dimensions";
import { useTheme } from "../../theme/ThemeProvider";

// An on/off rocker (iOS-style) — distinct from ColorSwitch's segmented pill,
// which picks one of several named options rather than flipping a single
// feature on or off.
export function Switch({ value, onChange }) {
  const { tokens } = useTheme();
  const travel = TOGGLE_WIDTH - TOGGLE_THUMB - TOGGLE_PADDING * 2;

  // Driven by a 0/1 progress value rather than animating color/position
  // props directly, since colors can't run on the native driver — this way
  // the thumb's slide (native) and the track/thumb color crossfade (JS)
  // stay in the same timing curve without fighting each other.
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  // Re-running this on `tokens` too (not just `value`) matters: a theme
  // flip re-renders with fresh interpolate() output colors, but the JS-driven
  // (non-native-driver) Animated view only actually repaints when the
  // underlying value is pushed through — it doesn't repaint just because the
  // interpolation config changed. Without this, the track/border/thumb keep
  // showing whatever they last painted until the switch is toggled.
  useEffect(() => {
    Animated.timing(progress, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value, progress, tokens]);

  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: [tokens.surface, tokens.accent] });
  const borderColor = progress.interpolate({ inputRange: [0, 1], outputRange: [tokens.lineStrong, tokens.accent] });
  const thumbColor = progress.interpolate({ inputRange: [0, 1], outputRange: [tokens.textDim, tokens.bg] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={{
          width: TOGGLE_WIDTH,
          height: TOGGLE_HEIGHT,
          borderRadius: TOGGLE_HEIGHT / 2,
          padding: TOGGLE_PADDING,
          backgroundColor: trackColor,
          borderWidth: 1.5,
          borderColor,
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={{
            width: TOGGLE_THUMB,
            height: TOGGLE_THUMB,
            borderRadius: TOGGLE_THUMB / 2,
            backgroundColor: thumbColor,
            transform: [{ translateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
