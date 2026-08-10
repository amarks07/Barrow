import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TriangleAlert } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "./Button";

// Generic destructive-action confirmation: states plainly what's about to
// happen and requires an explicit second tap, for irreversible actions whose
// consequences need more explanation than ConfirmDeleteButton's inline
// two-tap pattern can carry in a button label (e.g. "Clear workout data" in
// DangerZoneSection). Same top-anchored slide-down treatment as
// PremiumPlaceholderModal/ReauthModal. `onConfirm` may be async — the
// confirm button disables itself and shows "…" while it resolves.
export function ConfirmActionModal({ title, message, confirmLabel = "Continue", cancelLabel = "Cancel", onConfirm, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
        onPress={busy ? undefined : onClose}
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
        <View className="flex-row items-center justify-between mt-1">
          <Button label={cancelLabel} onPress={onClose} size="small" disabled={busy} />
          <Button
            label={busy ? "…" : confirmLabel}
            onPress={confirm}
            disabled={busy}
            variant="solid"
            size="small"
            style={{ backgroundColor: tokens.danger, borderColor: "rgba(0,0,0,0.3)" }}
            textStyle={{ color: "#FFFFFF" }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}
