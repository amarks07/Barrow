import { View } from "react-native";

// Approximates the web app's signature `Npx Npx 0 rgba(0,0,0,0.35)` hard
// offset shadow (Android's `elevation` only gives a soft blurred shadow,
// not a crisp offset one) by rendering a solid dark rectangle behind
// fixed-size content, offset by the same amount. Requires explicit
// width/height since the offset box needs to know the content's size.
export function HardShadow({ width, height, radius = 999, offset = 3, opacity = 0.35, style, children }) {
  return (
    <View style={[{ width: width + offset, height: height + offset }, style]}>
      <View
        style={{
          position: "absolute",
          top: offset,
          left: offset,
          width,
          height,
          borderRadius: radius,
          backgroundColor: `rgba(0,0,0,${opacity})`,
        }}
      />
      <View style={{ position: "absolute", top: 0, left: 0, width, height }}>{children}</View>
    </View>
  );
}
