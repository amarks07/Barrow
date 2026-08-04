import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Big reps/weight steppers, plus above, minus below.
export function Counter({ label, value, onInc, onDec, onChangeValue, plusButtons }) {
  const { tokens } = useTheme();
  return (
    <View
      className="flex-row items-center gap-3 rounded-[10px]"
      style={{ height: 64, paddingHorizontal: 8, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.3)", backgroundColor: tokens.surface }}
    >
      <Pressable onPress={onDec} accessibilityLabel={`Decrease ${label}`} style={{ width: 44, height: 64, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 24, lineHeight: 26, color: tokens.textDim }}>−</Text>
      </Pressable>

      <View className="flex-1 items-center justify-center">
        <TextInput
          keyboardType="decimal-pad"
          value={String(value)}
          onChangeText={onChangeValue}
          selectTextOnFocus
          className="w-full text-center"
          style={{ fontSize: 34, fontWeight: "700", color: tokens.text, fontVariant: ["tabular-nums"], padding: 0 }}
        />
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: tokens.textDim, lineHeight: 15 }}>{label}</Text>
      </View>

      {plusButtons ? (
        <View style={{ width: 44, height: 64, alignItems: "center", justifyContent: "center" }}>
          <Pressable onPress={plusButtons[0].onClick} style={{ width: 22, height: 31, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: tokens.accent }}>{plusButtons[0].label}</Text>
          </Pressable>
          <View style={{ width: 22, height: 1, backgroundColor: tokens.lineStrong }} />
          <Pressable onPress={plusButtons[1].onClick} style={{ width: 22, height: 32, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: tokens.accent }}>{plusButtons[1].label}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onInc} accessibilityLabel={`Increase ${label}`} style={{ width: 44, height: 64, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 24, lineHeight: 26, color: tokens.accent }}>+</Text>
        </Pressable>
      )}
    </View>
  );
}
