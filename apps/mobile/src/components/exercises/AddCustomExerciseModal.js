import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES, FIELD_DEFS } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CHIP_HEIGHT } from "../../theme/dimensions";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";

const SET_FORMATS = [
  { value: "sets", label: "Sets" },
  { value: "single", label: "Single" },
];

// Defaults for a freshly-picked category — mirrors the built-in seed split
// (Cardio: minutes+speed, single entry; everything else: weight+reps, a
// numbered set list). Only used to seed initial state, once, so switching
// category later never clobbers fields the user already picked.
function defaultsForCategory(category) {
  return category === "Cardio" ? { fields: ["time", "speed"], setFormat: "single" } : { fields: ["weight", "reps"], setFormat: "sets" };
}

export function AddCustomExerciseModal({ onClose, onSave }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [muscle, setMuscle] = useState("");
  const initialDefaults = useRef(defaultsForCategory(CATEGORIES[0])).current;
  const [fields, setFields] = useState(initialDefaults.fields);
  const [setFormat, setSetFormat] = useState(initialDefaults.setFormat);
  const [hasAngles, setHasAngles] = useState(false);

  const toggleField = (key) => {
    setFields((cur) => (cur.includes(key) ? cur.filter((f) => f !== key) : [...cur, key]));
  };

  // Angle variants (Flat/Incline/Decline) are a weighted-sets concept — like
  // Bench Press, the built-in exercise this mirrors — so the toggle is
  // hidden for Cardio, which never uses the "sets" format. Gating at save
  // time (not just render) means a stale on-toggle from before switching
  // into Cardio can never leak an angled Cardio exercise through.
  const isCardio = category === "Cardio";

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
          className="p-6"
          style={{
            backgroundColor: tokens.bg,
            borderTopWidth: 1.5,
            borderTopColor: tokens.line,
            paddingBottom: Math.max(20, insets.bottom),
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
            New exercise
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Exercise name"
            placeholderTextColor={tokens.textDim}
            autoFocus
            className="mb-4 py-1.5"
            style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }} className="mb-4">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable key={c} onPress={() => setCategory(c)} focusable={false}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: active ? "600" : "400",
                      color: active ? tokens.text : tokens.textDim,
                      textDecorationLine: active ? "underline" : "none",
                    }}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={muscle}
            onChangeText={setMuscle}
            placeholder="Specific muscle (e.g. Hamstrings) — optional"
            placeholderTextColor={tokens.textDim}
            className="mb-6 py-1.5"
            style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
          />
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 12, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Format
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }} className="mb-6">
            {SET_FORMATS.map((f) => {
              const active = setFormat === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setSetFormat(f.value)}
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
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? "#121214" : tokens.textDim,
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 12, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Metrics
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
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? "#121214" : tokens.textDim,
                    }}
                  >
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!isCardio && (
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ fontSize: 15, color: tokens.text }}>Angle variants (Flat/Incline/Decline)</Text>
              <Switch value={hasAngles} onChange={setHasAngles} />
            </View>
          )}
          <View className="flex-row items-center justify-between">
            <Button label="Cancel" onPress={onClose} size="medium" />
            <Button
              label="Save"
              onPress={() =>
                name.trim() &&
                fields.length > 0 &&
                onSave(name.trim(), category, muscle.trim(), fields, setFormat, hasAngles && !isCardio)
              }
              disabled={!name.trim() || fields.length === 0}
              variant="solid"
              size="medium"
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
