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
// PremiumPlaceholderModal/ReauthModal. `onConfirm`/`onExtra` may be async —
// whichever button was pressed disables itself and shows "…" while it
// resolves (the other stays disabled too, so a slow action can't be
// double-fired via the other button). `extraLabel`/`onExtra` are optional —
// pass both together for a rare three-way choice (e.g. the account-conflict
// prompt's "Merge"); every other call site only needs confirm/cancel.
export function ConfirmActionModal({
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  extraLabel,
  onConfirm,
  onClose,
  onExtra,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [busyAction, setBusyAction] = useState(null);
  const busy = busyAction !== null;

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const confirm = async () => {
    setBusyAction("confirm");
    try {
      await onConfirm();
    } finally {
      setBusyAction(null);
    }
  };

  const extra = async () => {
    setBusyAction("extra");
    try {
      await onExtra();
    } finally {
      setBusyAction(null);
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
          {extraLabel && (
            <Button label={busyAction === "extra" ? "…" : extraLabel} onPress={extra} disabled={busy} size="small" />
          )}
          <Button
            label={busyAction === "confirm" ? "…" : confirmLabel}
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
