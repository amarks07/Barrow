import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Play, Square } from "lucide-react-native";
import { Card } from "../ui/Card";
import { useTheme } from "../../theme/ThemeProvider";

const TICK_MS = 200;

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// The poses list + per-pose countdown timer for a stretch routine "exercise"
// (ex.type === "stretch"). Shared between DayView's expanded row and
// ExerciseFocusView's panel — the data it needs (ex.stretches) lives on the
// exercise definition itself, not the workout entry, so it doesn't need to
// know anything about the entry/workout it's rendered inside of.
//
// Only one pose timer runs at a time: starting one stops any other. The
// countdown is driven off a fixed end timestamp (not a naive per-tick
// decrement), so it stays accurate even if the interval itself is delayed
// or the screen re-renders.
export function StretchPanel({ ex }) {
  const { tokens } = useTheme();
  const [activeId, setActiveId] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const endAtRef = useRef(null);
  const intervalRef = useRef(null);
  const player = useAudioPlayer(require("../../../assets/sounds/stretch-complete.wav"));

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const finishTimer = () => {
    clearTimer();
    setActiveId(null);
    setRemainingMs(0);
    player.seekTo(0);
    player.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const stopTimer = () => {
    clearTimer();
    setActiveId(null);
    setRemainingMs(0);
  };

  const startTimer = (stretch) => {
    clearTimer();
    const endAt = Date.now() + stretch.seconds * 1000;
    endAtRef.current = endAt;
    setActiveId(stretch.id);
    setRemainingMs(stretch.seconds * 1000);
    intervalRef.current = setInterval(() => {
      const rem = endAtRef.current - Date.now();
      if (rem <= 0) finishTimer();
      else setRemainingMs(rem);
    }, TICK_MS);
  };

  return (
    <View style={{ gap: 8 }}>
      {ex.stretches.map((s) => {
        const isActive = activeId === s.id;
        const otherActive = activeId !== null && !isActive;
        return (
          <Card key={s.id} style={{ padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={{ fontSize: 12, color: isActive ? tokens.accent : tokens.textDim, marginTop: 2 }}>
                {isActive ? formatCountdown(remainingMs) : `${s.seconds}s`}
              </Text>
            </View>
            <Pressable
              onPress={() => (isActive ? stopTimer() : startTimer(s))}
              disabled={otherActive}
              accessibilityLabel={isActive ? `Stop ${s.name} timer` : `Start ${s.name} timer`}
              hitSlop={8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isActive ? tokens.accent : tokens.surface,
                borderWidth: 1.5,
                borderColor: isActive ? tokens.accent : tokens.lineStrong,
                opacity: otherActive ? 0.4 : 1,
              }}
            >
              {isActive ? <Square size={14} color="#121214" fill="#121214" /> : <Play size={14} color={tokens.text} fill={tokens.text} />}
            </Pressable>
          </Card>
        );
      })}
    </View>
  );
}
