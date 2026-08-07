import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Check, GripVertical, X } from "lucide-react-native";
import { exerciseMeta } from "@barrow/core";
import { Card } from "../ui/Card";

const SHIFT_ANIM_MS = 180;

// One exercise row in the template list. Split out from TemplateDetailView's
// render loop so it can own its own Animated.Value for the "make room"
// slide — that has to be a real per-instance hook, and hooks can't be
// called a variable number of times inside a .map() in the parent. Mirrors
// DayView.js's WorkoutEntryRow, stripped of everything workout-specific
// (no expand/sets/angle/history/swap — just name, meta, and remove).
export function TemplateExerciseRow({
  ex, tokens, run, supersetMode, removeSupersetMode, isSelected,
  isDragging, dragOffsetY, shiftY, refCallback, gesture, onRowTap, onRemove,
}) {
  const shiftShared = useSharedValue(0);

  useEffect(() => {
    if (isDragging) return;
    shiftShared.value = withTiming(shiftY, { duration: SHIFT_ANIM_MS });
  }, [shiftY, isDragging, shiftShared]);

  // dragOffsetY is a shared value driven directly from the UI-thread pan
  // worklet — reading it here keeps the dragged row's position a pure
  // UI-thread computation, so it tracks the finger every frame with no JS
  // round-trip to introduce lag.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging ? dragOffsetY.value : shiftShared.value }],
    zIndex: isDragging ? 10 : 0,
    elevation: isDragging ? 6 : 0,
    opacity: isDragging ? 0.97 : 1,
  }));

  const mode = supersetMode || removeSupersetMode;

  return (
    <Animated.View ref={refCallback} style={animatedStyle} className="mb-2">
      <View style={{ flexDirection: "row" }}>
        <Card style={{ padding: 12, flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          {mode ? (
            <Pressable onPress={onRowTap} className="flex-row items-center gap-2 flex-1" hitSlop={8}>
              {supersetMode && (
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: isSelected ? tokens.accent : "transparent",
                    borderWidth: 1.5,
                    borderColor: isSelected ? tokens.accent : tokens.lineStrong,
                  }}
                >
                  {isSelected && <Check size={12} color="#121214" />}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={2}>
                  {ex.name}
                </Text>
                <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
                  {exerciseMeta(ex)}
                </Text>
              </View>
            </Pressable>
          ) : (
            // Drag (long-press-and-hold) gesture over the content column —
            // templates have no expand/tap behavior to race against, unlike
            // DayView's rows, so this is drag-only.
            <GestureDetector gesture={gesture}>
              <View className="flex-row items-center gap-2 flex-1">
                <GripVertical size={14} color={tokens.textDim} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
                    {exerciseMeta(ex)}
                  </Text>
                </View>
              </View>
            </GestureDetector>
          )}

          {!mode && (
            <Pressable
              onPress={onRemove}
              accessibilityLabel={`Remove ${ex.name} from template`}
              hitSlop={8}
              style={{ padding: 6 }}
            >
              <X size={13} color={tokens.textDim} />
            </Pressable>
          )}
        </Card>

        {/* Always reserved at 12px wide (not just for grouped rows) so
            ungrouped and grouped rows still line up at the same right edge. */}
        <View style={{ position: "relative", width: 12 }}>
          {run.isGrouped && (
            <>
              {!run.isFirst && (
                <View style={{ position: "absolute", right: 3, top: 0, bottom: "50%", width: 1.5, backgroundColor: tokens.accent }} />
              )}
              {!run.isLast && (
                <View style={{ position: "absolute", right: 3, top: "50%", bottom: 0, width: 1.5, backgroundColor: tokens.accent }} />
              )}
              <View
                style={{
                  position: "absolute",
                  right: 0.5,
                  top: "50%",
                  marginTop: -3,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: tokens.accent,
                }}
              />
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
