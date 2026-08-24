import { forwardRef, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import {
  COUNTER_BUTTON_WIDTH,
  COUNTER_GAP,
  COUNTER_HEIGHT,
  COUNTER_LABEL_FONT_SIZE,
  COUNTER_SYMBOL_FONT_SIZE,
  COUNTER_VALUE_FONT_SIZE,
} from "../../theme/dimensions";

// Reps/weight steppers, plus above, minus below. `size` is "default" (the
// big Focus/Day view stepper) or "small" (compact inline use, e.g. Profile's
// feet/inches height entry). Pass `onPress` to make the value display-only
// (e.g. weight, which opens WeightEditModal instead of typing inline) — the
// +/- buttons keep working either way.
export const Counter = forwardRef(function Counter({ label, value, onInc, onDec, onChangeValue, onPress, size = "default" }, ref) {
  const { tokens } = useTheme();
  const height = COUNTER_HEIGHT[size];
  const buttonWidth = COUNTER_BUTTON_WIDTH[size];

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

  // Strips formatting quirks (leading zeros, trailing zeros after a decimal)
  // once the user is done editing, by resyncing to the canonical `String(value)`
  // — skipped if `text` doesn't actually parse to `value` (e.g. empty input),
  // same guard as the `value`-driven resync above.
  const handleBlur = () => {
    if (parseFloat(text) === value) setText(String(value));
  };

  const ValueWrapper = onPress ? Pressable : View;

  return (
    <View
      className="flex-row items-center rounded-[10px]"
      style={{ height, gap: COUNTER_GAP[size], paddingHorizontal: 8, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.3)", backgroundColor: tokens.surface }}
    >
      {/* focusable={false}: without it, Android hands this Pressable native
          view focus on tap, which pulls focus (and the keyboard) off the
          input beside it — same fix as WeightToolbar's tool chip. */}
      <Pressable onPress={onDec} focusable={false} accessibilityLabel={`Decrease ${label}`} style={{ width: buttonWidth, height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: COUNTER_SYMBOL_FONT_SIZE[size], lineHeight: COUNTER_SYMBOL_FONT_SIZE[size] + 2, color: tokens.textDim }}>−</Text>
      </Pressable>

      <ValueWrapper
        className="flex-1 items-center justify-center"
        {...(onPress ? { onPress, accessibilityLabel: `Edit ${label}` } : {})}
      >
        {onPress ? (
          // A plain Text, not a non-editable TextInput: on Android, an
          // EditText calls requestDisallowInterceptTouchEvent on touch-down
          // purely for being a text-editor class — editable={false} and
          // pointerEvents="none" don't stop that (see
          // software-mansion/react-native-gesture-handler#2112). Since this
          // Counter always sits inside a horizontally-swiping PagerView
          // (DayScreen/ExerciseFocusView page between days/exercises), that
          // swallows the touch stream before the native pager ever sees the
          // drag, so a swipe starting here does nothing instead of turning
          // the page. This mode never lets you type into it anyway (tapping
          // opens CounterEditModal/WeightEditModal instead) — a Text renders
          // identically with none of the native EditText behavior.
          <Text
            className="w-full text-center"
            style={{ fontSize: COUNTER_VALUE_FONT_SIZE[size], fontWeight: "700", color: tokens.text, fontVariant: ["tabular-nums"] }}
          >
            {text}
          </Text>
        ) : (
          <TextInput
            ref={ref}
            keyboardType="decimal-pad"
            value={text}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            className="w-full text-center"
            style={{ fontSize: COUNTER_VALUE_FONT_SIZE[size], fontWeight: "700", color: tokens.text, fontVariant: ["tabular-nums"], padding: 0 }}
          />
        )}
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: COUNTER_LABEL_FONT_SIZE[size], color: tokens.textDim, lineHeight: COUNTER_LABEL_FONT_SIZE[size] + 2 }}>{label}</Text>
      </ValueWrapper>

      <Pressable onPress={onInc} focusable={false} accessibilityLabel={`Increase ${label}`} style={{ width: buttonWidth, height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: COUNTER_SYMBOL_FONT_SIZE[size], lineHeight: COUNTER_SYMBOL_FONT_SIZE[size] + 2, color: tokens.accent }}>+</Text>
      </Pressable>
    </View>
  );
});
