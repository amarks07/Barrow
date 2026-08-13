import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { GripVertical, Timer } from "lucide-react-native";
import { patchWorkout } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";
import { useAppState } from "../../state/AppStateProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { asyncStorageAdapter } from "../../state/storage";
import { namespacedKey } from "../../state/accountNamespace";
import { navigationRef } from "../../navigation/navigationRef";

const FOCUS_POINTER_KEY = "barrow:focusPointer";

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Default bottom-left anchor the drag offset (translateX/translateY below)
// is measured from, and how close dragging may bring the container to a
// screen edge.
const LEFT_ANCHOR = 20;
const EDGE_MARGIN = 8;

function triggerDragHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Mounted once in App.js, outside RootNavigator (same tier as the app's
// other always-on-top overlays), so this stays visible across every screen
// for as long as a workout timer is running — not just while on Day/Focus
// view, where WorkoutTimerControl's "Start workout" button lives instead.
// workoutTimerStartedAt is global app state, so this picks the timer back
// up correctly after a navigate-away, backgrounding, or even an app
// relaunch mid-workout. Starts anchored bottom-left but can be dragged
// anywhere on screen from anywhere on the card (see cardWidth/cardHeight
// below for why the drag offset is clamped to those, not tracked
// separately) — the grip icon is just a visual affordance, same one
// DayView's rows use to signal "this can be dragged".
export function WorkoutTimerBadge() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { workoutTimerEnabled, workoutTimerAutoOpenSummary, workoutTimerStartedAt, setWorkoutTimerStartedAt, setWorkouts, activeAccountId } =
    useAppState();
  const [now, setNow] = useState(Date.now());
  const bottomAnchor = insets.bottom + 20;

  useEffect(() => {
    if (!workoutTimerStartedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [workoutTimerStartedAt]);

  // Two-step end, same "arm, then confirm" pattern as ConfirmDeleteButton —
  // a lone tap here is easy to land by accident while just reaching for
  // something else in the corner. Auto-disarms after 3s if not confirmed.
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  useEffect(() => {
    if (!confirmingEnd) return undefined;
    const t = setTimeout(() => setConfirmingEnd(false), 3000);
    return () => clearTimeout(t);
  }, [confirmingEnd]);

  // barrow:focusPointer is kept pointed at whichever workout is being timed
  // (written by DayScreen/ExerciseFocusScreen while the timer runs — see
  // their own comments), so it's also the one place that knows which
  // workout "End workout" should stamp endedAt onto and (per the auto-open
  // sub-option in Preferences) open the summary for. No pointer (e.g. a
  // timer left running from before this feature shipped) just falls back
  // to clearing the timer, same as before.
  const handleConfirmedEnd = async () => {
    const endedAt = Date.now();
    setWorkoutTimerStartedAt(null);
    try {
      const raw = await asyncStorageAdapter.getItem(namespacedKey(FOCUS_POINTER_KEY, activeAccountId));
      const pointer = raw ? JSON.parse(raw) : null;
      if (pointer?.dateKey && pointer?.workoutId) {
        setWorkouts((cur) => patchWorkout(cur, pointer.dateKey, pointer.workoutId, { endedAt }));
        if (workoutTimerAutoOpenSummary && navigationRef.isReady()) {
          navigationRef.navigate("Main", {
            screen: "WorkoutSummary",
            params: { dateKey: pointer.dateKey, workoutId: pointer.workoutId },
          });
        }
      }
    } catch (e) {
      console.error("Barrow: failed to open workout summary after ending timer", e);
    }
  };

  const handleEndPress = () => {
    if (confirmingEnd) {
      setConfirmingEnd(false);
      handleConfirmedEnd();
    } else {
      setConfirmingEnd(true);
    }
  };

  // Drag offset from the default bottom-left anchor, plus the container's
  // own measured size (needed to keep it fully on-screen while dragging) —
  // both live on the UI thread so the pan gesture tracks the finger every
  // frame with no JS round-trip, same approach as DayView's row-reorder
  // drag. cardWidth/cardHeight are set from onLayout below, not measured
  // per-gesture, since the card's size doesn't change while dragging.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);

  const minTx = EDGE_MARGIN - LEFT_ANCHOR;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(triggerDragHaptic)();
    })
    .onUpdate((e) => {
      // Inlined rather than calling a shared helper — a plain JS closure
      // (even one only touching shared values) isn't itself a worklet, and
      // calling it from here (running on the UI thread) is what threw.
      const maxTx = winW - EDGE_MARGIN - cardWidth.value - LEFT_ANCHOR;
      const minTy = bottomAnchor - winH + insets.top + EDGE_MARGIN + cardHeight.value;
      const maxTy = bottomAnchor - EDGE_MARGIN;
      translateX.value = Math.min(Math.max(startX.value + e.translationX, minTx), maxTx);
      translateY.value = Math.min(Math.max(startY.value + e.translationY, minTy), maxTy);
    })
    // Doesn't stay wherever it's dropped horizontally — clips to whichever
    // side of the screen it's closer to, like a chat head, so it never ends
    // up floating in the middle blocking content. Vertical position is left
    // exactly where dropped (already clamped on-screen above).
    .onEnd(() => {
      const maxTx = winW - EDGE_MARGIN - cardWidth.value - LEFT_ANCHOR;
      const cardCenterX = LEFT_ANCHOR + translateX.value + cardWidth.value / 2;
      const snapToRight = cardCenterX > winW / 2;
      translateX.value = withTiming(snapToRight ? maxTx : minTx, { duration: 220 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!workoutTimerEnabled || !workoutTimerStartedAt) return null;

  return (
    <View style={{ position: "absolute", left: LEFT_ANCHOR, bottom: bottomAnchor, zIndex: 30 }}>
      <Animated.View
        style={animatedStyle}
        onLayout={(e) => {
          cardWidth.value = e.nativeEvent.layout.width;
          cardHeight.value = e.nativeEvent.layout.height;
        }}
      >
        {/* The pan gesture covers the whole card, not just the grip icon —
            a tap that doesn't move stays a tap (End workout's own Pressable
            still gets it), so this only intercepts actual drag motions. */}
        <GestureDetector gesture={panGesture}>
          <Card style={{ padding: 16, gap: 12, borderColor: tokens.accent }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Timer size={17} color={tokens.accent} />
                <Text
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    includeFontPadding: false,
                    textAlignVertical: "center",
                    color: tokens.text,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatElapsed(now - workoutTimerStartedAt)}
                </Text>
              </View>
              <GripVertical size={16} color={tokens.textDim} />
            </View>
            <Button
              // Forces a remount on top of Button's own variant/disabled
              // key — confirmingEnd changes backgroundColor via the style
              // override below, which Button's internal key doesn't
              // account for, and patching only backgroundColor on an
              // already-mounted view is exactly the Android rounded-corner
              // bug that trick exists to dodge (see Button.js).
              key={String(confirmingEnd)}
              label={confirmingEnd ? "End workout?" : "End workout"}
              onPress={handleEndPress}
              variant="outline"
              size="medium"
              fullWidth
              style={{
                backgroundColor: confirmingEnd ? tokens.danger : "transparent",
                borderColor: tokens.danger,
              }}
              textStyle={{ color: confirmingEnd ? "#FFFFFF" : tokens.danger }}
            />
          </Card>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}
