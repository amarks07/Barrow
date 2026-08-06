import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Button } from "../ui/Button";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { StrengthFields } from "./StrengthFields";
import { CardioFields } from "./CardioFields";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function SetCounters({ sets, set, unit, isCardio, onUpdate, onRemove, autoFocusField }) {
  const { tokens } = useTheme();
  const [swipeArmed, setSwipeArmed] = useState(false);
  const armedTimeout = useRef(null);

  // Numbered within its own type (warmup vs working) rather than by raw
  // position in the exercise's set list — so toggling an earlier set's
  // warmup flag renumbers the working sets after it instead of leaving a
  // gap, and vice versa.
  const sameTypeSets = sets.filter((s) => !!s.warmup === !!set.warmup);
  const displayNumber = sameTypeSets.findIndex((s) => s.id === set.id) + 1;

  useEffect(
    () => () => {
      if (armedTimeout.current) clearTimeout(armedTimeout.current);
    },
    []
  );

  const handleSwipe = () => {
    setSwipeArmed((cur) => {
      if (cur) {
        onRemove();
        return false;
      }
      if (armedTimeout.current) clearTimeout(armedTimeout.current);
      armedTimeout.current = setTimeout(() => setSwipeArmed(false), 3000);
      return true;
    });
  };

  // Left swipe, clearly more horizontal than vertical, past a real
  // threshold — same rule as the web app's touch-based swipe-to-delete.
  // activeOffsetX/failOffsetY let a vertical scroll inside the parent
  // ScrollView pass through untouched instead of being claimed here.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      const isLeftSwipe = e.translationX < -60 && Math.abs(e.translationX) > Math.abs(e.translationY) * 1.5;
      if (isLeftSwipe) handleSwipe();
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="mb-3 p-3 rounded-lg"
        style={{
          borderWidth: 1.5,
          borderColor: swipeArmed ? tokens.danger : tokens.lineStrong,
          // Warmup sets get a faint light-gray wash so they read as
          // distinct from working sets at a glance, without competing with
          // the swipe-to-delete red tint above.
          backgroundColor: swipeArmed ? "rgba(216,50,47,0.08)" : set.warmup ? "rgba(255,255,255,0.06)" : "transparent",
        }}
      >
        <View className="flex-row items-center justify-between gap-2 mb-2">
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 14,
              textTransform: "uppercase",
              color: swipeArmed ? tokens.danger : tokens.textDim,
            }}
          >
            {set.warmup ? "Warmup" : "Working Set"} {displayNumber}
            {swipeArmed ? " · swipe again to delete" : ""}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Button label="Warmup" onPress={() => onUpdate("warmup", !set.warmup)} variant={set.warmup ? "solid" : "outline"} />
            <ConfirmDeleteButton onConfirm={onRemove} />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          {isCardio ? (
            <CardioFields set={set} unit={unit} onUpdate={onUpdate} autoFocusField={autoFocusField} />
          ) : (
            <StrengthFields set={set} unit={unit} onUpdate={onUpdate} autoFocusField={autoFocusField} />
          )}
        </View>
      </View>
    </GestureDetector>
  );
}
