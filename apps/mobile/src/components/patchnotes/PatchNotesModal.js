import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Megaphone } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Shown exactly once per version bump, on app open, for the version just
// installed (see usePatchNotes) — never reappears once dismissed, until the
// next version ships a new patchNotes.js entry. The full patch notes
// history lives in the dedicated PatchNotesView screen instead, reachable
// any time from Preferences. Same top-anchored slide-down treatment as
// ProfileOnboardingModal/PremiumPlaceholderModal's intro card. `entry` is a
// PATCH_NOTES item ({ version, title, notes }); renders nothing if there's
// no entry yet for the running version.
export function PatchNotesModal({ entry, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  if (!entry) return null;

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
          <Megaphone size={22} color={tokens.accent} />
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text, flex: 1 }}>{`What's new in v${entry.version}`}</Text>
        </View>
        <View className="mb-4" style={{ gap: 6 }}>
          {entry.notes.map((note, i) => (
            <View key={i} className="flex-row" style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>{note}</Text>
            </View>
          ))}
        </View>
        <Button label="Got it" onPress={onClose} variant="solid" size="medium" fullWidth />
      </Animated.View>
    </Modal>
  );
}
