import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Megaphone } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Splits inline **bold**/*italic* runs out of a paragraph — the small
// markdown subset the `announcements` table's rich-text `message` column
// supports (see supabase/schema.sql). Deliberately just enough parsing for
// an admin's one-off message, not a general markdown renderer.
function parseInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={`${keyPrefix}-${i}`} style={{ fontWeight: "700" }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <Text key={`${keyPrefix}-${i}`} style={{ fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

function RichText({ message, style }) {
  return message.split(/\n{2,}/).map((paragraph, i) => (
    <Text key={i} style={[style, i > 0 && { marginTop: 8 }]}>
      {parseInline(paragraph, i)}
    </Text>
  ));
}

// Shown once per admin-published announcement (see useAnnouncement) — same
// top-anchored slide-down treatment as PatchNotesModal/BiometricPromptModal.
// Cancel and the default close (backdrop tap / hardware back) both just
// dismiss; continue additionally opens `continue_action` (a URL) first, when
// one is set — an announcement with no continue_action just gets a single
// effective "OK" via either button.
export function AnnouncementModal({ announcement, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const handleContinue = () => {
    if (announcement.continue_action) {
      Linking.openURL(announcement.continue_action).catch((e) =>
        console.error("Barrow: failed to open announcement continue_action", e)
      );
    }
    onClose();
  };

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
        <View className="flex-row items-center gap-3 mb-3">
          <Megaphone size={22} color={tokens.accent} />
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Announcement</Text>
        </View>
        <View className="mb-4">
          <RichText message={announcement.message} style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} />
        </View>
        <View className="flex-row items-center justify-between">
          <Button label={announcement.cancel_label} onPress={onClose} size="small" />
          <Button label={announcement.continue_label} onPress={handleContinue} variant="solid" size="medium" />
        </View>
      </Animated.View>
    </Modal>
  );
}
