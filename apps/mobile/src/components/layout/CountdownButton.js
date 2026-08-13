import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { Pause, Timer } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useAppState } from "../../state/AppStateProvider";
import { FONT_SANS } from "../../theme/fonts";
import { CountdownModal, formatCountdown } from "./CountdownModal";

const TICK_MS = 250;

// Sits next to AppHeader's preferences button. Idle, this is a 32x32
// circular button (same recipe as Settings) that opens CountdownModal to
// set a duration. Once started, it replaces itself with a live mm:ss pill —
// tapping that reopens the same modal to pause/reset/stop the timer, rather
// than navigating anywhere. Countdown math is a fixed end timestamp (like
// StretchPanel's pose timer), but persisted via AppStateProvider's
// countdownEndAt so it keeps counting down correctly across a background/
// kill-relaunch, same as the workout timer. Pausing swaps that fixed end
// timestamp for a frozen countdownPausedMs (see AppStateProvider) rather
// than stopping the interval on its own — a paused countdown has no "now"
// to tick against, so remaining time has to live somewhere static instead.
export function CountdownButton() {
  const { tokens } = useTheme();
  const {
    countdownEndAt,
    setCountdownEndAt,
    countdownPausedMs,
    setCountdownPausedMs,
    countdownDurationMs,
    setCountdownDurationMs,
  } = useAppState();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!countdownEndAt) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [countdownEndAt]);

  const running = !!countdownEndAt;
  const paused = countdownPausedMs != null;
  const active = running || paused;
  const remainingMs = running ? countdownEndAt - now : paused ? countdownPausedMs : 0;

  // Fires once the ticking `now` carries remainingMs past zero — clears the
  // persisted end time and gives a completion buzz. Only relevant while
  // actually running: a paused countdown is frozen, so it can never reach
  // zero on its own. Also covers a countdown that finished while the app
  // was backgrounded/killed: it'll run once on the first tick after
  // relaunch instead of silently sitting negative.
  useEffect(() => {
    if (running && remainingMs <= 0) {
      setCountdownEndAt(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remainingMs]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={active ? `Countdown timer, ${formatCountdown(remainingMs)} remaining` : "Set countdown timer"}
        style={{
          height: 32,
          minWidth: 32,
          paddingHorizontal: active ? 10 : 0,
          borderRadius: 999,
          backgroundColor: tokens.surface,
          borderWidth: 1.5,
          borderColor: running ? tokens.accent : tokens.lineStrong,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {active ? (
          <>
            {paused ? <Pause size={14} color={tokens.textDim} /> : <Timer size={14} color={tokens.accent} />}
            <Text
              style={{
                fontFamily: FONT_SANS,
                fontSize: 13,
                includeFontPadding: false,
                textAlignVertical: "center",
                color: paused ? tokens.textDim : tokens.accent,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatCountdown(remainingMs)}
            </Text>
          </>
        ) : (
          <Timer size={16} color={tokens.textDim} />
        )}
      </Pressable>

      <CountdownModal
        visible={open}
        onClose={() => setOpen(false)}
        active={active}
        paused={paused}
        remainingMs={remainingMs}
        initialDurationMs={countdownDurationMs}
        onStart={(durationMs) => {
          setCountdownDurationMs(durationMs);
          setCountdownEndAt(Date.now() + durationMs);
          setCountdownPausedMs(null);
          setOpen(false);
        }}
        onPause={() => {
          setCountdownPausedMs(countdownEndAt - Date.now());
          setCountdownEndAt(null);
        }}
        onResume={() => {
          setCountdownEndAt(Date.now() + countdownPausedMs);
          setCountdownPausedMs(null);
        }}
        onReset={() => {
          setCountdownEndAt(Date.now() + countdownDurationMs);
          setCountdownPausedMs(null);
          setOpen(false);
        }}
        onStop={() => {
          setCountdownEndAt(null);
          setCountdownPausedMs(null);
          setOpen(false);
        }}
      />
    </>
  );
}
