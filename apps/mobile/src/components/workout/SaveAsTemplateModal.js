import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function SaveAsTemplateModal({ onClose, onSave }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");

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
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-1">
            Save as template
          </Text>
          <Text style={{ fontSize: 12, color: tokens.textDim }} className="mb-4">
            Saves today's exercise list so you can pull it into any workout later.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Template name (e.g. Push Day)"
            placeholderTextColor={tokens.textDim}
            autoFocus
            className="mb-4 py-1.5"
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
            <Pressable onPress={() => name.trim() && onSave(name.trim())}>
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
