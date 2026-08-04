import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Button } from "../ui/Button";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { StrengthFields } from "./StrengthFields";
import { CardioFields } from "./CardioFields";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function SetCounters({ index, set, unit, isCardio, onUpdate, onRemove }) {
  const { tokens } = useTheme();
  const [swipeArmed, setSwipeArmed] = useState(false);
  const armedTimeout = useRef(null);

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
          backgroundColor: swipeArmed ? "rgba(216,50,47,0.08)" : "transparent",
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
            Set {index + 1}
            {swipeArmed ? " · swipe again to delete" : ""}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Button label="Warmup" onPress={() => onUpdate("warmup", !set.warmup)} variant={set.warmup ? "solid" : "outline"} />
            <ConfirmDeleteButton onConfirm={onRemove} />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          {isCardio ? (
            <CardioFields set={set} unit={unit} onUpdate={onUpdate} />
          ) : (
            <StrengthFields set={set} unit={unit} onUpdate={onUpdate} />
          )}
        </View>
      </View>
    </GestureDetector>
  );
}
