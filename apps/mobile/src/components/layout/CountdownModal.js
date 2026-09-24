import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pause, Play, RotateCcw, Square, X } from "lucide-react-native";
import { Button } from "../ui/Button";
import { IconBtn } from "../ui/IconBtn";
import { WheelPickerRow } from "../ui/WheelPickerRow";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const MINUTES_RANGE = Array.from({ length: 100 }, (_, i) => i); // 0-99
const SECONDS_RANGE = Array.from({ length: 60 }, (_, i) => i); // 0-59

// Ceil (not floor) so the display doesn't flash e.g. "0:00" a tick before
// the timer actually finishes — same reasoning as StretchPanel's own
// formatCountdown.
export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Bottom-sheet opened by CountdownButton — same slide-up chrome as
// PickerField (Modal stays mounted, `visible` toggling re-arms the slide
// animation since this is opened/closed repeatedly from one button rather
// than mounted fresh per open). Idle: a minutes/seconds wheel + "Start".
// Running or paused (`active`): the remaining time plus Pause/Resume,
// "Reset" (restart from the same duration), and "Stop" (clear the timer) —
// no re-entry of the duration, matching CountdownButton's "tap again to
// pause, reset, or stop" contract. Reset/Stop close the sheet afterward
// since there's nothing left to look at here once the timer's been reset
// back to running or cleared entirely; Start/Pause/Resume leave it open —
// Start so you can watch it actually begin counting down instead of the
// sheet vanishing the instant you tap it, Pause/Resume since the whole
// point is watching the frozen/live time and toggling it right back,
// possibly more than once.
export function CountdownModal({
  visible,
  onClose,
  active,
  paused,
  remainingMs,
  initialDurationMs,
  onStart,
  onPause,
  onResume,
  onReset,
  onStop,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(Math.floor(initialDurationMs / 60000));
  const [seconds, setSeconds] = useState(Math.floor((initialDurationMs % 60000) / 1000));

  const slideAnim = useRef(new Animated.Value(1000)).current;
  useEffect(() => {
    if (!visible) return;
    setMinutes(Math.floor(initialDurationMs / 60000));
    setSeconds(Math.floor((initialDurationMs % 60000) / 1000));
    slideAnim.setValue(1000);
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const durationMs = (minutes * 60 + seconds) * 1000;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          onPress={onClose}
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
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: tokens.text, flex: 1 }}>Countdown Timer</Text>
            <IconBtn label="Close" onPress={onClose}>
              <X size={17} color={tokens.text} />
            </IconBtn>
          </View>

          {active ? (
            <View className="items-center py-6" style={{ gap: 20 }}>
              <Text
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 40,
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  color: paused ? tokens.textDim : tokens.accent,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatCountdown(remainingMs)}
              </Text>
              <View className="flex-row px-5" style={{ gap: 10 }}>
                {paused ? (
                  <Button label="Resume" onPress={onResume} size="medium" variant="outline" icon={<Play size={14} color={tokens.textDim} />} />
                ) : (
                  <Button label="Pause" onPress={onPause} size="medium" variant="outline" icon={<Pause size={14} color={tokens.textDim} />} />
                )}
                <Button
                  label="Reset"
                  onPress={onReset}
                  size="medium"
                  variant="outline"
                  icon={<RotateCcw size={14} color={tokens.textDim} />}
                />
                <Button
                  label="Stop"
                  onPress={onStop}
                  size="medium"
                  variant="outline"
                  icon={<Square size={14} color={tokens.danger} />}
                  style={{ borderColor: tokens.danger }}
                  textStyle={{ color: tokens.danger }}
                />
              </View>
            </View>
          ) : (
            <>
              <View className="items-center py-6">
                <WheelPickerRow
                  columns={[
                    {
                      items: MINUTES_RANGE.map((m) => ({ label: String(m) })),
                      selectedIndex: minutes,
                      onChange: setMinutes,
                      width: 64,
                      editable: true,
                      valueBase: 0,
                    },
                    {
                      items: SECONDS_RANGE.map((s) => ({ label: String(s).padStart(2, "0") })),
                      selectedIndex: seconds,
                      onChange: setSeconds,
                      width: 64,
                      editable: true,
                      valueBase: 0,
                    },
                  ]}
                />
              </View>
              <View className="px-5">
                <Button label="Start" onPress={() => onStart(durationMs)} size="large" variant="solid" fullWidth disabled={durationMs <= 0} />
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
