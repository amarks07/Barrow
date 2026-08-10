import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pencil, X } from "lucide-react-native";
import { Button } from "./Button";
import { IconBtn } from "./IconBtn";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// A read-only "text field" row (same look as the other Profile fields) that
// opens a bottom-sheet Modal containing the caller's own picker UI when
// tapped or its edit icon is pressed. Exists because a WheelPicker's
// vertical drag gesture doesn't survive being embedded inline inside
// Profile's outer ScrollView (same-orientation nested scrollables fight over
// the gesture) — pushing the dials into their own Modal sidesteps that
// entirely. Sheet chrome (slide-up animation, flat top border, header, Done
// button) matches the AddCustomExerciseModal/SaveAsRoutineModal bottom
// sheets, just sized to its content instead of full screen.
export function PickerField({ label, title, displayValue, placeholder = "Not set", children }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // Modal stays mounted with `open` toggling `visible`, so (unlike the
  // exercise/routine sheets that mount fresh each time) the slide-in has to
  // be re-armed on every open rather than just once on mount.
  const slideAnim = useRef(new Animated.Value(1000)).current;
  useEffect(() => {
    if (open) {
      slideAnim.setValue(1000);
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  }, [open, slideAnim]);

  return (
    <View className="mb-4">
      <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={`Edit ${label}`}
        className="flex-row items-center justify-between py-1.5"
        style={{ borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
      >
        <Text style={{ fontSize: 16, color: displayValue ? tokens.text : tokens.textDim }}>{displayValue || placeholder}</Text>
        <Pencil size={14} color={tokens.textDim} />
      </Pressable>

      <Modal transparent animationType="none" visible={open} onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityLabel="Close"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          />
          <Animated.View
            style={{
              backgroundColor: tokens.bg,
              borderTopWidth: 1.5,
              borderTopColor: tokens.line,
              paddingBottom: Math.max(16, insets.bottom),
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View
              className="flex-row items-center gap-3 px-5 pb-4 pt-4"
              style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
            >
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: tokens.text, flex: 1 }}>{title}</Text>
              <IconBtn label="Close" onPress={() => setOpen(false)}>
                <X size={17} color={tokens.text} />
              </IconBtn>
            </View>
            <View className="items-center py-6">{children}</View>
            <View className="px-5">
              <Button label="Done" onPress={() => setOpen(false)} size="large" variant="solid" fullWidth />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
