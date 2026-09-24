import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TriangleAlert } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Shown on app open for the first unread notification with `urgent: true`
// (see the `urgent` column on the `notifications` table in
// supabase/schema.sql, and useNotifications' urgentItem) — same
// top-anchored slide-down treatment as ErrorModal/AnnouncementModal, but
// deliberately just a single "Close": an urgent notification has no
// continue action to offer, unlike an announcement. onClose marks the row
// read so it doesn't reopen on the next app launch.
export function UrgentNotificationModal({ notification, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const header = notification.data?.header || "Notification";
  const body = notification.data?.body || "";

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
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>{header}</Text>
        </View>
        {body ? (
          <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
            {body}
          </Text>
        ) : null}
        <Button label="Close" onPress={onClose} variant="solid" size="medium" fullWidth />
      </Animated.View>
    </Modal>
  );
}
