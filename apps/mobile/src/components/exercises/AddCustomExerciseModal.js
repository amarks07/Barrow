import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

export function AddCustomExerciseModal({ onClose, onSave }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [muscle, setMuscle] = useState("");

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
                <Pressable key={c} onPress={() => setCategory(c)}>
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
          <View className="flex-row items-center justify-between">
            <Button label="Cancel" onPress={onClose} size="medium" />
            <Button
              label="Save"
              onPress={() => name.trim() && onSave(name.trim(), category, muscle.trim())}
              disabled={!name.trim()}
              variant="solid"
              size="medium"
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
