import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

const TITLES = { signin: "Sign in", signup: "Create account", forgot: "Reset password" };

// Shown instead of the profile screen whenever there's no signed-in
// session. Same overlay-with-backdrop treatment as AddCustomExerciseModal/
// TemplateBuilder, just anchored to the top instead of the bottom. Modal's
// built-in animationType="slide" always enters from the bottom of the
// screen regardless of where the content sits, so the panel drives its own
// slide-down-from-top animation instead.
export function SignInModal({ cloudSync, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { available, status, error, signIn, signUp, resetPassword } = cloudSync;

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const busy = status === "authenticating";
  const done = status === "confirm-email" || status === "reset-email-sent";

  const submit = () => {
    if (!email.trim()) return;
    if (mode === "signin") password && signIn(email.trim(), password);
    else if (mode === "signup") password && signUp(email.trim(), password);
    else resetPassword(email.trim());
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-start" }}>
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
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Password"
                  placeholderTextColor={tokens.textDim}
                  onSubmitEditing={submit}
                  className="mb-2 py-1.5"
                  style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
                />
              )}

              {status === "error" && error && (
                <Text style={{ fontSize: 12, color: tokens.danger }} className="mt-2">
                  {error}
                </Text>
              )}

              <View className="items-start gap-2 mt-3 mb-4">
                {mode === "signin" && (
                  <Pressable onPress={() => setMode("forgot")}>
                    <Text style={{ fontSize: 12, color: tokens.textDim }}>
                      Forgot your password?
                    </Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  <Text style={{ fontSize: 12, color: tokens.accent }}>
                    {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          <View className="flex-row items-center justify-between">
            <Pressable onPress={done ? onClose : mode === "forgot" ? () => setMode("signin") : onClose}>
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
                disabled={busy}
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
