import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function AddCustomExerciseModal({ onClose, onSave }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [muscle, setMuscle] = useState("");

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
        />
        <View
          className="p-5"
          style={{ backgroundColor: tokens.bg, borderTopWidth: 1.5, borderTopColor: tokens.line, paddingBottom: Math.max(20, insets.bottom) }}
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
            <Pressable onPress={onClose}>
              <Text
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 13,
                  lineHeight: 13,
                  textTransform: "uppercase",
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  color: tokens.textDim,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable onPress={() => name.trim() && onSave(name.trim(), category, muscle.trim())}>
              <Text
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 13,
                  lineHeight: 13,
                  textTransform: "uppercase",
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  color: tokens.text,
                }}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
