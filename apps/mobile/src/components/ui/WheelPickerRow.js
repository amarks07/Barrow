import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { WheelPicker, WHEEL_ITEM_HEIGHT, WHEEL_PADDING } from "./WheelPicker";

// Lays out several WheelPicker dials side by side under one shared highlight
// bar (e.g. month/day/year, or feet/inches) instead of each dial drawing its
// own. `columns` is an array of WheelPicker props minus `showHighlight`.
export function WheelPickerRow({ columns }) {
  const { tokens } = useTheme();
  return (
    <View style={{ position: "relative", alignSelf: "center" }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: WHEEL_PADDING,
          left: 0,
          right: 0,
          height: WHEEL_ITEM_HEIGHT,
          borderTopWidth: 1.5,
          borderBottomWidth: 1.5,
          borderColor: tokens.lineStrong,
        }}
      />
      <View className="flex-row" style={{ gap: 4 }}>
        {columns.map((col, i) => (
          <WheelPicker key={i} {...col} showHighlight={false} />
        ))}
      </View>
    </View>
  );
}
