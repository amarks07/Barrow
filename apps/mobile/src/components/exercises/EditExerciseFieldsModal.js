import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FIELD_DEFS, hasHistoryForExercise } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CHIP_HEIGHT } from "../../theme/dimensions";
import { Button } from "../ui/Button";

function fieldName(key) {
  return FIELD_DEFS.find((f) => f.key === key)?.name ?? key;
}

// Lets the user change which metrics an exercise (built-in or custom)
// tracks. When fields are being removed and the exercise already has logged
// history, a second step asks whether to leave that history's stored values
// alone or move them onto one of the newly-added fields — see
// remapExerciseFields (packages/core/workoutMutations.js) for what "map"
// actually rewrites. `onSave(fields, fieldMap)` is called exactly once, with
// fieldMap empty unless the user chose to map removed fields onto new ones.
export function EditExerciseFieldsModal({ exercise, workouts, onClose, onSave }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState(exercise.fields);
  // "edit" (the chip picker) or "conflict" (keep-as-is vs map) — "conflict"
  // is only reached from handleSave below, when fields are actually being
  // removed from an exercise that already has logged history.
  const [step, setStep] = useState("edit");
  const [pending, setPending] = useState(null); // { removed, added } once in "conflict"
  // { [removedKey]: addedKeyOrNull } — which new field (if any) each removed
  // field's history should move onto, while resolving "conflict" via mapping.
  const [mapping, setMapping] = useState({});

  const toggleField = (key) => {
    setFields((cur) => (cur.includes(key) ? cur.filter((f) => f !== key) : [...cur, key]));
  };

  const slideAnim = useRef(new Animated.Value(1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const handleSave = () => {
    const removed = exercise.fields.filter((k) => !fields.includes(k));
    const added = fields.filter((k) => !exercise.fields.includes(k));
    if (removed.length === 0 || !hasHistoryForExercise(workouts, exercise.id)) {
      onSave(fields, {});
      return;
    }
    setPending({ removed, added });
    setStep("conflict");
  };

  const keepAsIs = () => onSave(fields, {});

  const applyMapping = () => {
    const fieldMap = {};
    pending.removed.forEach((key) => {
      if (mapping[key]) fieldMap[key] = mapping[key];
    });
    onSave(fields, fieldMap);
  };

  const chosenAddedKeys = new Set(Object.values(mapping).filter(Boolean));

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
        />
        <Animated.View
          className="p-6"
          style={{
            backgroundColor: tokens.bg,
            borderTopWidth: 1.5,
            borderTopColor: tokens.line,
            paddingBottom: Math.max(20, insets.bottom),
            transform: [{ translateY: slideAnim }],
          }}
        >
          {step === "edit" ? (
            <>
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
                Edit fields
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} className="mb-6">
                {FIELD_DEFS.map((f) => {
                  const active = fields.includes(f.key);
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => toggleField(f.key)}
                      focusable={false}
                      style={{
                        height: CHIP_HEIGHT,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        backgroundColor: active ? tokens.accent : tokens.surface,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#121214" : tokens.textDim }}>{f.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View className="flex-row items-center justify-between">
                <Button label="Cancel" onPress={onClose} size="medium" />
                <Button label="Save" onPress={handleSave} disabled={fields.length === 0} variant="solid" size="medium" />
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-3">
                Existing history
              </Text>
              <Text style={{ fontSize: 14, color: tokens.textDim }} className="mb-6">
                {exercise.name} has logged history tracking {pending.removed.map(fieldName).join(", ")}. Keep that history as
                recorded, or move it onto {pending.added.length > 0 ? "one of the fields you just added" : "nothing"}?
              </Text>

              {pending.added.length > 0 && (
                <View className="mb-6" style={{ gap: 14 }}>
                  {pending.removed.map((removedKey) => (
                    <View key={removedKey}>
                      <Text style={{ fontSize: 12, color: tokens.textDim }} className="mb-1.5">
                        Move "{fieldName(removedKey)}" data to
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {[null, ...pending.added].map((addedKey) => {
                          const active = (mapping[removedKey] ?? null) === addedKey;
                          const disabledOption = !!addedKey && chosenAddedKeys.has(addedKey) && mapping[removedKey] !== addedKey;
                          return (
                            <Pressable
                              key={addedKey ?? "discard"}
                              disabled={disabledOption}
                              onPress={() => setMapping((prev) => ({ ...prev, [removedKey]: addedKey }))}
                              focusable={false}
                              style={{
                                height: CHIP_HEIGHT,
                                paddingHorizontal: 12,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 999,
                                opacity: disabledOption ? 0.4 : 1,
                                backgroundColor: active ? tokens.accent : tokens.surface,
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#121214" : tokens.textDim }}>
                                {addedKey ? fieldName(addedKey) : "Discard"}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View className="flex-row items-center justify-between">
                <Button label="Cancel" onPress={onClose} size="medium" />
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Button label="Keep as-is" onPress={keepAsIs} size="medium" />
                  {pending.added.length > 0 && <Button label="Map fields" onPress={applyMapping} variant="solid" size="medium" />}
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
