import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MenuRow } from "../ui/MenuRow";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Action sheet for changing the profile picture, opened by tapping the
// avatar in ProfileSettingsView once signed in (a signed-out tap opens
// SignInModal instead — picture upload needs a session, see
// useProfilePicture.js). Same top-anchored slide-down treatment as
// BiometricPromptModal/PremiumPlaceholderModal. Closes immediately on any
// option — the system camera/library picker takes over the screen next, and
// the upload itself keeps running via `profilePicture` (owned by the
// caller) after this unmounts; ProfileSettingsView's avatar shows its own
// `profilePicture.uploading` spinner for that window, and failures surface
// via Alert.alert from the hook rather than inline sheet state.
export function ChangeProfilePictureSheet({ hasPicture, profilePicture, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { pickFromCamera, pickFromLibrary, remove } = profilePicture;

  const slideAnim = useRef(new Animated.Value(-1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const choose = (action) => {
    onClose();
    action();
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
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
          Profile picture
        </Text>

        <View style={{ gap: 10 }} className="mb-4">
          <MenuRow label="Take photo" subtitle="Use your camera" onPress={() => choose(pickFromCamera)} />
          <MenuRow label="Choose from library" subtitle="Pick an existing photo" onPress={() => choose(pickFromLibrary)} />
          {hasPicture && <MenuRow label="Remove photo" subtitle="Back to initials" onPress={() => choose(remove)} />}
        </View>

        <Pressable onPress={onClose}>
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 13,
              lineHeight: 13,
              textTransform: "uppercase",
              includeFontPadding: false,
              textAlignVertical: "center",
              textAlign: "center",
              color: tokens.textDim,
            }}
          >
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
