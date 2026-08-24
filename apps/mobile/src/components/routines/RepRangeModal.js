import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Bottom sheet for setting an exercise's target rep range within a routine —
// opened by tapping the range text/pill on its row in RoutineBuilder (new
// routine) or RoutineExerciseRow (existing routine). Mirrors
// SaveAsRoutineModal's shape (plain TextInputs, no stepper — a routine's
// target range is a one-time-per-exercise edit, not something worth a full
// Counter UI for). Min and max travel together: saving requires both, and
// the only way to remove a range once set is the explicit Clear button
// (matches setRoutineRepRange's null/null-clears contract).
export function RepRangeModal({ exerciseName, min, max, onSave, onClear, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [minText, setMinText] = useState(min != null ? String(min) : "");
  const [maxText, setMaxText] = useState(max != null ? String(max) : "");
  const hasExisting = min != null && max != null;

  const minVal = parseInt(minText, 10);
  const maxVal = parseInt(maxText, 10);
  const canSave = Number.isFinite(minVal) && Number.isFinite(maxVal) && minVal > 0 && maxVal >= minVal;

  const slideAnim = useRef(new Animated.Value(1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
        />
        <Animated.View
          className="p-5"
          style={{
            backgroundColor: tokens.bg,
            borderTopWidth: 1.5,
            borderTopColor: tokens.line,
            paddingBottom: Math.max(20, insets.bottom),
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-1" numberOfLines={1}>
            Rep range
          </Text>
          <Text style={{ fontSize: 12, color: tokens.textDim }} className="mb-4" numberOfLines={1}>
            {exerciseName} · used to steer set recommendations
          </Text>
          <View className="flex-row items-center gap-4 mb-6">
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
                Min
              </Text>
              <TextInput
                value={minText}
                onChangeText={setMinText}
                placeholder="8"
                placeholderTextColor={tokens.textDim}
                keyboardType="number-pad"
                autoFocus
                className="py-1.5"
                style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
                Max
              </Text>
              <TextInput
                value={maxText}
                onChangeText={setMaxText}
                placeholder="12"
                placeholderTextColor={tokens.textDim}
                keyboardType="number-pad"
                className="py-1.5"
                style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
              />
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Button label="Cancel" size="medium" onPress={onClose} />
              {hasExisting && <Button label="Clear" size="medium" onPress={onClear} />}
            </View>
            <Button label="Save" size="medium" variant="solid" disabled={!canSave} onPress={() => onSave(minVal, maxVal)} />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
