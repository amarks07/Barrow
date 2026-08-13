import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Fingerprint } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Shown once, right after a first sign-in, offering to turn on biometric
// unlock (see useCloudSync's biometricPromptVisible). Same top-anchored
// slide-down treatment as SignInModal/ResetPasswordModal.
export function BiometricPromptModal({ cloudSync }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { acceptBiometricPrompt, dismissBiometricPrompt } = cloudSync;

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  return (
    <Modal transparent animationType="none" visible onRequestClose={dismissBiometricPrompt}>
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
        onPress={dismissBiometricPrompt}
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
          <Fingerprint size={22} color={tokens.accent} />
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Quick unlock</Text>
        </View>
        <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
          Use Face ID or your fingerprint to open your profile instead of signing in again each time.
        </Text>

        <View className="flex-row items-center justify-between">
          <Button label="Not now" onPress={dismissBiometricPrompt} size="small" />
          <Button label="Enable" onPress={acceptBiometricPrompt} variant="solid" size="medium" />
        </View>
      </Animated.View>
    </Modal>
  );
}
