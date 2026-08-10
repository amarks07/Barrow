import { useCallback, useRef } from "react";
import { Animated, Easing } from "react-native";

// An Animated.Value that sweeps 0 -> 1 each time `trigger()` is called —
// drives Card's `pulse` prop, which turns that into a Material-style
// ripple growing out from the card's center while fading out. Eased in/out
// (rather than linear) so the ripple — and its fade, which rides the same
// value — starts and ends slow instead of cutting in/out abruptly.
// Runs on the native driver since it only ever backs transform/opacity.
export function usePulse(duration = 700) {
  const anim = useRef(new Animated.Value(0)).current;

  const trigger = useCallback(() => {
    anim.stopAnimation();
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [anim, duration]);

  return [anim, trigger];
}
