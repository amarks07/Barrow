import { useState } from "react";
import { Modal, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";

// Shown automatically (regardless of whatever else is on screen) whenever
// cloudSync.recoveryMode is true — i.e. the person just landed back on the
// app from a "reset your password" email link. A native Modal naturally
// renders above the whole navigation tree, matching the web app's z-50
// always-on-top overlay.
export function ResetPasswordModal({ cloudSync }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const { status, error, updatePassword } = cloudSync;
  const busy = status === "authenticating";

  const submit = () => password.length >= 6 && updatePassword(password);

  return (
    <Modal transparent animationType="fade" visible>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}>
        <View
          className="p-5"
          style={{ backgroundColor: tokens.bg, borderBottomWidth: 1.5, borderBottomColor: tokens.line, paddingTop: Math.max(20, insets.top) }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-1">
            Set a new password
          </Text>
          <Text style={{ fontSize: 12, color: tokens.textDim }} className="mb-4">
            Choose a new password for your account.
          </Text>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            placeholder="New password"
            autoFocus
            onSubmitEditing={submit}
            className="mb-2"
          />
          {status === "error" && error && (
            <Text style={{ fontSize: 12, color: tokens.danger }} className="mt-2 mb-2">
              {error}
            </Text>
          )}
          <View className="flex-row items-center justify-end mt-3">
            <Button label={busy ? "…" : "Set password"} onPress={submit} disabled={busy || password.length < 6} variant="solid" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
