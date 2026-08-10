import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Fingerprint, Lock } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";

// Shown when the automatic Face ID/fingerprint attempt at app launch (or a
// manual "Unlock to sync" tap) doesn't clear the mandatory re-auth gate —
// see useCloudSync's reauthPromptVisible. That covers both "no biometric
// hardware/nothing enrolled" and "the user just backed out of the system
// prompt", so this offers a retry (biometricSupported) alongside the
// fallback: re-verifying the already-signed-in account with a password for
// an email account, or "Continue with Google" for an OAuth-only one. Same
// top-anchored slide-down treatment as SignInModal/BiometricPromptModal.
export function ReauthModal({ cloudSync }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const {
    session,
    reauthError,
    status,
    biometricSupported,
    unlockSync,
    reauthenticateWithPassword,
    reauthenticateWithGoogle,
    dismissReauthPrompt,
  } = cloudSync;

  const isGoogle = session?.user?.app_metadata?.provider === "google";
  const busy = status === "authenticating";

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const submit = () => password && reauthenticateWithPassword(password);

  return (
    <Modal transparent animationType="none" visible onRequestClose={dismissReauthPrompt}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-start" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={dismissReauthPrompt}
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
            <Lock size={22} color={tokens.accent} />
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Unlock to sync</Text>
          </View>
          <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
            Confirm it's you before Barrow resumes backing up to the cloud. Your data stays on this device either way.
          </Text>

          {biometricSupported && (
            <>
              <Button
                label="Use Face ID / fingerprint"
                onPress={unlockSync}
                icon={<Fingerprint size={16} color={tokens.textDim} />}
                fullWidth
                size="medium"
                style={{ marginBottom: 16 }}
              />
              <View className="flex-row items-center mb-4">
                <View style={{ flex: 1, height: 1.5, backgroundColor: tokens.line }} />
                <Text style={{ fontSize: 11, color: tokens.textDim }} className="mx-3">
                  or
                </Text>
                <View style={{ flex: 1, height: 1.5, backgroundColor: tokens.line }} />
              </View>
            </>
          )}

          {isGoogle ? (
            <Button
              label={busy ? "…" : "Continue with Google"}
              onPress={reauthenticateWithGoogle}
              disabled={busy}
              fullWidth
              size="medium"
              style={{ marginBottom: 8 }}
            />
          ) : (
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              autoComplete="current-password"
              placeholder="Password"
              onSubmitEditing={submit}
              autoFocus
              className="mb-2"
            />
          )}

          {reauthError && (
            <Text style={{ fontSize: 12, color: tokens.danger }} className="mt-2 mb-2">
              {reauthError}
            </Text>
          )}

          <View className="flex-row items-center justify-between mt-3">
            <Button label="Not now" onPress={dismissReauthPrompt} size="small" />
            {!isGoogle && (
              <Button label={busy ? "…" : "Unlock"} onPress={submit} disabled={busy || !password} variant="solid" size="small" />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
