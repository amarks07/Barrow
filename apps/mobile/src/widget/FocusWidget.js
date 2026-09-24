import { THEME_TOKENS } from "../theme/tokens";
import { applyAccent } from "../theme/accentPalette";
import { WeekStripScreen } from "./screens/WeekStripScreen";
import { DayBrowseScreen } from "./screens/DayBrowseScreen";
import { FocusExerciseScreen } from "./screens/FocusExerciseScreen";

// Root of the Android home screen widget — routes to one of three screens
// based on `state.screen` (from packages/core focusStorage.resolveWidgetState):
// "week" (the default/home view — a 7-day strip), "day" (one date's
// workouts, with Start/End controls), or "focus" (the existing per-set step
// editor). focusWidgetTaskHandler.js and refreshFocusWidget.js are the only
// two callers — both resolve the full state first, then just render it here.
//
// Tokens are resolved once here (rather than by each screen) from `theme`/
// `accentColor`, already plain props rather than the app's ThemeProvider
// context, since this tree is rendered headless (often with no app process
// at all) and each render call needs its own tokens, not whatever a shared
// module-level value happened to hold last.
export function FocusWidget({ state, unit, theme, accentColor, workoutTimerEnabled, refreshing }) {
  const tokens = applyAccent(THEME_TOKENS[theme] ?? THEME_TOKENS.dark, accentColor);

  if (state.screen === "day") {
    return (
      <DayBrowseScreen
        dateKey={state.dateKey}
        workouts={state.workouts}
        resumable={state.resumable}
        confirmingEnd={state.confirmingEnd}
        refreshing={refreshing}
        workoutTimerEnabled={workoutTimerEnabled}
        tokens={tokens}
      />
    );
  }

  if (state.screen === "focus") {
    return (
      <FocusExerciseScreen
        snapshot={state.snapshot}
        unit={unit}
        workoutTimerEnabled={workoutTimerEnabled}
        workoutTimerStartedAt={state.workoutTimerStartedAt}
        confirmingEnd={state.confirmingEnd}
        refreshing={refreshing}
        tokens={tokens}
      />
    );
  }

  return (
    <WeekStripScreen
      weekCursor={state.weekCursor}
      days={state.days}
      resumable={state.resumable}
      refreshing={refreshing}
      tokens={tokens}
    />
  );
}
