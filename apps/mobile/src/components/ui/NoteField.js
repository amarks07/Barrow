import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Toggle button that opens a NoteModal — a call site slots this into an
// existing row of actions (e.g. next to "History") and renders NoteModal
// itself wherever it manages that row's open state.
export function NoteButton({ onToggle, label = "Notes" }) {
  return <Button label={label} onPress={onToggle} />;
}

// Same top-anchored slide-down treatment as SignInModal: a dimmed backdrop
// plus a panel that drives its own translateY animation, since Modal's
// built-in animationType="slide" always enters from the bottom regardless
// of where the content sits.
export function NoteModal({ title = "Note", value, onChange, placeholder = "Add note", onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-1000)).current;

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-start" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
        />
        <Animated.View
          className="p-5"
          style={{
            backgroundColor: tokens.bg,
            borderBottomWidth: 1.5,
            borderBottomColor: tokens.line,
            paddingTop: insets.top + 20,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
            {title}
          </Text>

          <TextInput
            value={value || ""}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={tokens.textDim}
            multiline
            autoFocus
            className="mb-4"
            style={{
              fontSize: 14,
              color: tokens.text,
              minHeight: 100,
              textAlignVertical: "top",
              borderWidth: 1.5,
              borderColor: tokens.lineStrong,
              borderRadius: 8,
              padding: 10,
            }}
          />

          <View className="flex-row items-center justify-end">
            <Button label="Done" onPress={onClose} variant="solid" size="medium" />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Self-contained button+modal with its own open state, for call sites with
// no existing action row to place the button in (e.g. Exercise Focus).
export function NoteField({ value, onChange, placeholder, label, title }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NoteButton onToggle={() => setOpen(true)} label={label} />
      {open && (
        <NoteModal title={title} value={value} onChange={onChange} placeholder={placeholder} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
