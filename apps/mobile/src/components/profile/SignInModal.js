import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";

const TITLES = { signin: "Sign in", signup: "Create account", forgot: "Reset password" };

// Shown instead of the profile screen whenever there's no signed-in
// session. Same overlay-with-backdrop treatment as AddCustomExerciseModal/
// RoutineBuilder, just anchored to the top instead of the bottom. Modal's
// built-in animationType="slide" always enters from the bottom of the
// screen regardless of where the content sits, so the panel drives its own
// slide-down-from-top animation instead.
export function SignInModal({ cloudSync, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { available, status, error, signIn, signUp, signInWithGoogle, resetPassword, dismissMessage } = cloudSync;

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const busy = status === "authenticating";
  const done = status === "confirm-email" || status === "reset-email-sent";
  const mismatch = mode === "signup" && confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmitSignup = mode !== "signup" || (password && password === confirmPassword);

  // Closing on a one-shot message (or a stale error) clears it first, so
  // reopening the modal later starts fresh instead of re-showing it.
  const close = () => {
    if (done || status === "error") dismissMessage();
    onClose();
  };

  const submit = () => {
    if (!email.trim()) return;
    if (mode === "signin") password && signIn(email.trim(), password);
    else if (mode === "signup") canSubmitSignup && signUp(email.trim(), password);
    else resetPassword(email.trim());
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-start" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={close}
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
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
            {TITLES[mode]}
          </Text>

          {!available ? (
            <Text style={{ fontSize: 13, color: tokens.textDim }} className="mb-4">
              Cloud backup isn't configured for this app yet.
            </Text>
          ) : status === "confirm-email" ? (
            <Text style={{ fontSize: 13, color: tokens.textDim }} className="mb-4">
              Check your email to confirm your account, then sign in.
            </Text>
          ) : status === "reset-email-sent" ? (
            <Text style={{ fontSize: 13, color: tokens.textDim }} className="mb-4">
              Check your email for a link to reset your password.
            </Text>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <Button
                    label={busy ? "…" : "Continue with Google"}
                    onPress={signInWithGoogle}
                    disabled={busy}
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

              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="Email"
                placeholderTextColor={tokens.textDim}
                autoFocus
                className="mb-4 py-1.5"
                style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
              />

              {mode !== "forgot" && (
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Password"
                  onSubmitEditing={mode === "signup" ? undefined : submit}
                  className="mb-2"
                />
              )}

              {mode === "signup" && (
                <PasswordInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  onSubmitEditing={submit}
                  className="mb-2"
                />
              )}

              {mismatch && (
                <Text style={{ fontSize: 12, color: tokens.danger }} className="mb-2">
                  Passwords don't match.
                </Text>
              )}

              {status === "error" && error && (
                <Text style={{ fontSize: 12, color: tokens.danger }} className="mt-2">
                  {error}
                </Text>
              )}

              <View className="items-start gap-2 mt-3 mb-4">
                {mode === "signin" && (
                  <Pressable onPress={() => setMode("forgot")} focusable={false}>
                    <Text style={{ fontSize: 12, color: tokens.textDim }}>
                      Forgot your password?
                    </Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} focusable={false}>
                  <Text style={{ fontSize: 12, color: tokens.accent }}>
                    {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          <View className="flex-row items-center justify-between">
            <Pressable onPress={done ? close : mode === "forgot" ? () => setMode("signin") : close} focusable={false}>
              <Text
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 13,
                  lineHeight: 13,
                  textTransform: "uppercase",
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  color: tokens.textDim,
                }}
              >
                {done ? "Close" : mode === "forgot" ? "Back" : "Cancel"}
              </Text>
            </Pressable>
            {available && !done && (
              <Button
                label={busy ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
                onPress={submit}
                disabled={busy || !canSubmitSignup}
                variant="solid"
                size="medium"
              />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
