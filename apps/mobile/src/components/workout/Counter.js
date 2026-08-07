import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Big reps/weight steppers, plus above, minus below.
export function Counter({ label, value, onInc, onDec, onChangeValue, autoFocus }) {
  const { tokens } = useTheme();

  // The input mirrors `value` (a parsed number) rather than being driven by
  // it directly, so an in-progress fraction like "12." isn't immediately
  // re-rendered back to "12" — parseFloat("12.") === 12, which would strip
  // the trailing "." (and, by extension, any decimal at all) before the
  // user can type the digit after it. Only resyncs from `value` when it's
  // changed for a reason other than this input's own typing (+/- buttons,
  // unit conversion).
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (parseFloat(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChangeText = (t) => {
    setText(t);
    onChangeValue(t);
  };

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
          value={text}
          onChangeText={handleChangeText}
          selectTextOnFocus
          autoFocus={autoFocus}
          className="w-full text-center"
          style={{ fontSize: 34, fontWeight: "700", color: tokens.text, fontVariant: ["tabular-nums"], padding: 0 }}
        />
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: tokens.textDim, lineHeight: 15 }}>{label}</Text>
      </View>

      <Pressable onPress={onInc} accessibilityLabel={`Increase ${label}`} style={{ width: 44, height: 64, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 24, lineHeight: 26, color: tokens.accent }}>+</Text>
      </Pressable>
    </View>
  );
}
