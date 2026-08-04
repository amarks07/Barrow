import { useState } from "react";
import { Pressable } from "react-native";

// Plain style objects only — no className, no style-as-function — since
// every back/close button in the app goes through this one component and
// Nativewind's className has proven unreliable on a few other components
// today. This is the most defensive version: guaranteed hit target size,
// no dependency on class compilation at all.
export function IconBtn({ onPress, children, label }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.4 : 1 }}
    >
      {children}
    </Pressable>
  );
}
