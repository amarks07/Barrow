import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

const SIZE = 48;
const SHADOW_OFFSET = 3;

// Default `bottom` is a small flat margin — FAB is only ever used inside a
// tab screen (Exercises/Templates), and material-top-tabs lays the tab bar
// out as a sibling (not an overlay), so each scene already stops right
// above it. No extra clearance or safe-area math needed here.
//
// Renders with plain style objects (not the `style={(state) => ...}`
// function form) and its own onPressIn/onPressOut instead, and inlines the
// hard-shadow rectangle directly rather than going through a wrapper
// component — both were suspected of quietly dropping the shape styles
// (width/height/borderRadius) on Android, which is what made this render
// as a plain square.
export function FAB({ onPress, label, bottom = 20 }) {
  const { tokens } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <View style={{ position: "absolute", right: 20, bottom, width: SIZE + SHADOW_OFFSET, height: SIZE + SHADOW_OFFSET, zIndex: 25 }}>
      <View
        style={{
          position: "absolute",
          top: SHADOW_OFFSET,
          left: SHADOW_OFFSET,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      />
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityLabel={label}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 2,
          borderColor: "rgba(0,0,0,0.3)",
          backgroundColor: tokens.accent,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.95 : 1 }],
        }}
      >
        <Text style={{ fontSize: 24, lineHeight: 26, fontWeight: "500", color: "#121214" }}>+</Text>
      </Pressable>
    </View>
  );
}
