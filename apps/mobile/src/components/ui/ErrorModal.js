import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TriangleAlert } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "./Button";

// Generic failure notice — states what went wrong and requires a single
// dismiss tap. Same top-anchored slide-down treatment as
// ConfirmActionModal/PremiumPlaceholderModal, but for a plain "something
// failed" message with no second action to confirm — the in-app equivalent
// of Alert.alert for flows that need to match the app's own styling instead
// of the OS system dialog.
export function ErrorModal({ title, message, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
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
        <View className="flex-row items-center gap-3 mb-2">
          <TriangleAlert size={22} color={tokens.danger} />
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>{title}</Text>
        </View>
        <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
          {message}
        </Text>
        <Button label="Got it" onPress={onClose} variant="solid" size="medium" fullWidth />
      </Animated.View>
    </Modal>
  );
}
