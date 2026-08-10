import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

let tmpIdCounter = 0;
function makeTmpId() {
  tmpIdCounter += 1;
  return `tmp-${Date.now()}-${tmpIdCounter}`;
}

function blankStretch() {
  return { id: makeTmpId(), name: "", seconds: "30" };
}

// Create/edit form for a stretch routine — a named, ordered list of poses,
// each with its own hold duration (used by StretchPanel's countdown timer).
// Bottom-sheet shell mirrors AddCustomExerciseModal; the pose list itself is
// the one genuinely new piece of UI (nothing else in the app lets a user
// build an ordered list of small custom items inline like this).
export function StretchRoutineModal({ initial, onClose, onSave }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name || "");
  const [stretches, setStretches] = useState(() =>
    initial?.stretches?.length
      ? initial.stretches.map((s) => ({ id: s.id, name: s.name, seconds: String(s.seconds) }))
      : [blankStretch()]
  );

  const updateStretch = (id, field, value) =>
    setStretches((cur) => cur.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const removeStretch = (id) => setStretches((cur) => cur.filter((s) => s.id !== id));

  const validStretches = stretches
    .map((s) => ({ id: s.id, name: s.name.trim(), seconds: Math.round(Number(s.seconds)) }))
    .filter((s) => s.name.length > 0 && s.seconds > 0);
  const canSave = name.trim().length > 0 && validStretches.length > 0;

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
            maxHeight: "85%",
            paddingBottom: Math.max(20, insets.bottom),
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
            {initial ? "Edit stretch routine" : "New stretch routine"}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Routine name (e.g. Post-run stretches)"
            placeholderTextColor={tokens.textDim}
            autoFocus={!initial}
            className="mb-4 py-1.5"
            style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
          />

          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 12, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Poses
          </Text>

          <ScrollView style={{ flexGrow: 0, marginBottom: 12 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              {stretches.map((s) => (
                <View key={s.id} className="flex-row items-center gap-2">
                  <TextInput
                    value={s.name}
                    onChangeText={(v) => updateStretch(s.id, "name", v)}
                    placeholder="Pose name"
                    placeholderTextColor={tokens.textDim}
                    className="flex-1 py-1.5"
                    style={{ fontSize: 14, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
                  />
                  <TextInput
                    value={s.seconds}
                    onChangeText={(v) => updateStretch(s.id, "seconds", v.replace(/[^0-9]/g, ""))}
                    placeholder="30"
                    placeholderTextColor={tokens.textDim}
                    keyboardType="number-pad"
                    className="py-1.5"
                    style={{ width: 48, fontSize: 14, color: tokens.text, textAlign: "center", borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
                  />
                  <Text style={{ fontSize: 11, color: tokens.textDim }}>sec</Text>
                  <Pressable
                    onPress={() => removeStretch(s.id)}
                    focusable={false}
                    accessibilityLabel="Remove pose"
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <X size={13} color={tokens.textDim} />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable
            onPress={() => setStretches((cur) => [...cur, blankStretch()])}
            focusable={false}
            className="w-full py-2.5 rounded-lg items-center mb-6"
            style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: tokens.lineStrong }}
          >
            <Text
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                lineHeight: 13,
                textTransform: "uppercase",
                includeFontPadding: false,
                textAlignVertical: "center",
                color: tokens.accent,
              }}
            >
              + Add pose
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-between">
            <Button label="Cancel" onPress={onClose} size="medium" />
            <Button
              label="Save"
              onPress={() => canSave && onSave(name.trim(), validStretches)}
              disabled={!canSave}
              variant="solid"
              size="medium"
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
