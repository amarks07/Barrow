import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rocket } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Also used by UpdateBanner's persistent Profile-screen affordance.
export const DOWNLOAD_URL = "https://barrow-psi.vercel.app";

// Shown on app open whenever the installed build is behind
// `app_config.mobile_version` (see useAppVersionCheck) — same top-anchored
// slide-down treatment as BiometricPromptModal, but with the three-way
// choice ("ask later" vs. a permanent opt-out for this version vs. the
// suggested action) ConfirmActionModal's extraLabel already establishes for
// this app, instead of that modal's plain two buttons.
export function UpdateAvailableModal({ latestVersion, onDismiss, onDismissForever }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const handleUpdate = () => {
    Linking.openURL(DOWNLOAD_URL).catch((e) => console.error("Barrow: failed to open " + DOWNLOAD_URL, e));
    onDismiss();
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={onDismiss}>
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
        onPress={onDismiss}
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
          <Rocket size={22} color={tokens.accent} />
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Update available</Text>
        </View>
        <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
          {`Barrow ${latestVersion} is out — you're on an older build. Grab the latest from the Barrow website.`}
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Button label="Not now" onPress={onDismiss} size="small" />
            <Button label="Never show again" onPress={onDismissForever} size="small" />
          </View>
          <Button label="Update" onPress={handleUpdate} variant="solid" size="medium" />
        </View>
      </Animated.View>
    </Modal>
  );
}
