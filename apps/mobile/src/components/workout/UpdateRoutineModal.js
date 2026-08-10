import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Confirms which routine to overwrite with the current workout's exercise
// list. A workout can be linked to more than one routine (see
// `routineIds`), so with more than one candidate this shows a picker
// instead of a single confirm.
export function UpdateRoutineModal({ routines, onClose, onConfirm }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const single = routines.length === 1 ? routines[0] : null;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
        />
        <Animated.View
          className="p-5"
          style={{
            backgroundColor: tokens.bg,
            borderTopWidth: 1.5,
            borderTopColor: tokens.line,
            paddingBottom: Math.max(20, insets.bottom),
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-1">
            Update routine
          </Text>
          {single ? (
            <>
              <Text style={{ fontSize: 12, color: tokens.textDim }} className="mb-4">
                Replace "{single.name}"'s exercise list with today's workout? This can't be undone.
              </Text>
              <View className="flex-row items-center justify-between">
                <Button label="Cancel" size="medium" onPress={onClose} />
                <Button label="Update" size="medium" variant="solid" onPress={() => onConfirm(single.id)} />
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: tokens.textDim }} className="mb-4">
                Choose which routine to replace with today's workout.
              </Text>
              <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8 }}>
                {routines.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => onConfirm(r.id)}
                    className="py-3 px-4"
                    style={{ borderWidth: 1.5, borderColor: tokens.lineStrong, borderRadius: 12 }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>{r.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View className="mt-4 items-center">
                <Button label="Cancel" size="medium" onPress={onClose} />
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
