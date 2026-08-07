import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";

// Same bottom-sheet treatment as SaveAsTemplateModal/UpdateTemplateModal —
// collects an exercise row's History/Note/Swap/Remove actions behind one
// "Actions" button instead of four separate pills crowding the row.
export function ExerciseActionsMenu({ title, onHistory, onNote, onSwap, onRemove, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1000)).current;

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const act = (fn) => () => {
    fn();
    onClose();
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
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
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4" numberOfLines={1}>
            {title}
          </Text>

          <View className="gap-3">
            <Button label="History" fullWidth size="medium" onPress={act(onHistory)} />
            <Button label="Notes" fullWidth size="medium" onPress={act(onNote)} />
            <Button label="Swap exercise" fullWidth size="medium" onPress={act(onSwap)} />
            <ConfirmDeleteButton label="Remove from workout" confirmLabel="Remove?" onConfirm={act(onRemove)} size="medium" />
          </View>

          <View className="mt-4 items-center">
            <Button label="Cancel" size="medium" onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
