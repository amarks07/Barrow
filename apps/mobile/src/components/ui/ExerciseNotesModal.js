import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dayLabel } from "@barrow/core";
import { Button } from "./Button";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Combined editor for the two kinds of exercise notes: one that follows the
// exercise everywhere (exerciseNote, keyed by exercise id — see
// useExerciseActions' setExerciseNote) and one scoped to a single day's
// logged instance of it (dayNote, i.e. an entry's `note` — see
// workoutMutations' setEntryNote). Both live in one modal with a single
// "Done" button rather than two separate note buttons, since they're both
// answers to the same question ("what should I remember about this
// exercise?") just at different scopes. Same top-anchored slide-down
// treatment as NoteModal.
export function ExerciseNotesModal({
  exerciseName,
  dateKey,
  exerciseNote,
  onChangeExerciseNote,
  dayNote,
  onChangeDayNote,
  onClose,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-1000)).current;

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const sectionLabelStyle = { fontFamily: FONT_DISPLAY, fontSize: 12, textTransform: "uppercase", color: tokens.textDim };
  const inputStyle = {
    fontSize: 14,
    color: tokens.text,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1.5,
    borderColor: tokens.lineStrong,
    borderRadius: 8,
    padding: 10,
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
            {exerciseName}
          </Text>

          <Text style={sectionLabelStyle} className="mb-2">
            Exercise notes
          </Text>
          <TextInput
            value={exerciseNote || ""}
            onChangeText={onChangeExerciseNote}
            placeholder="Add a note that follows this exercise everywhere"
            placeholderTextColor={tokens.textDim}
            multiline
            className="mb-5"
            style={inputStyle}
          />

          <Text style={sectionLabelStyle} className="mb-2">
            Notes for {dayLabel(dateKey)}
          </Text>
          <TextInput
            value={dayNote || ""}
            onChangeText={onChangeDayNote}
            placeholder="Add a note for this day only"
            placeholderTextColor={tokens.textDim}
            multiline
            className="mb-4"
            style={inputStyle}
          />

          <View className="flex-row items-center justify-end">
            <Button label="Done" onPress={onClose} variant="solid" size="medium" />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
