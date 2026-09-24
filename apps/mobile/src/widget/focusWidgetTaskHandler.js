import {
  resolveWidgetState,
  focusAdjustReps,
  focusAdjustWeight,
  focusAddSet,
  focusRemoveSet,
  focusNavigateStep,
  focusToggleWarmup,
  focusScrollSets,
  widgetShiftWeek,
  widgetSelectDay,
  widgetBackToWeek,
  widgetShiftDay,
  widgetOpenWorkout,
  widgetStartWorkout,
  widgetEndWorkout,
  widgetResumeWorkout,
  widgetBackFromFocus,
} from "@barrow/core";
import { asyncStorageAdapter } from "../state/storage";
import { getActiveAccountId, withAccountNamespace } from "../state/accountNamespace";
import { readExercises, readUnit, readTheme, readAccentColor, readWorkoutTimerEnabled } from "../state/focusReaders";
import { FocusWidget } from "./FocusWidget";

// This handler runs headless — via Android's HeadlessJsTaskService, with no
// AppStateProvider and often no app process at all (widget taps reach it
// even with the app fully killed). It reads/writes barrow:* AsyncStorage
// keys directly through packages/core's focusStorage module, the same one
// the in-app usePersistedState-backed state ultimately reads/writes to, so
// there's one source of truth regardless of which JS context touched it.

const REP_STEP = 1;
const WEIGHT_STEP = 5;

// REFRESH_WIDGET's own read is effectively instant (a couple of AsyncStorage
// gets), so without this delay the "Refreshing…" state would flash for a
// single frame instead of being readable.
const REFRESH_LABEL_VISIBLE_MS = 600;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Set-editing actions only ever fire while the widget is showing the focus
// (step editor) screen — every other action (week/day nav, start/end
// workout) is handled by the widget* functions in focusStorage.js, each of
// which already returns the next resolveWidgetState() result itself.
const SET_EDIT_ACTIONS = new Set([
  "REPS_PLUS",
  "REPS_MINUS",
  "WEIGHT_PLUS",
  "WEIGHT_MINUS",
  "ADD_SET",
  "REMOVE_SET",
  "TOGGLE_WARMUP",
  "PREV_STEP",
  "NEXT_STEP",
  "SCROLL_UP",
  "SCROLL_DOWN",
]);

export async function focusWidgetTaskHandler(props) {
  const { widgetAction, clickAction, clickActionData, renderWidget } = props;
  // Resolved once per invocation (not per key) — this runs headless, with
  // no React tree to hold the active account in state like AppStateProvider
  // does, so every barrow:* key this handler touches goes through this one
  // namespaced adapter instead of the raw one.
  const storage = withAccountNamespace(asyncStorageAdapter, await getActiveAccountId());

  const readCommon = () =>
    Promise.all([readExercises(storage), readUnit(storage), readTheme(storage), readAccentColor(storage), readWorkoutTimerEnabled(storage)]);

  const render = (state, common, refreshing) => {
    const [, unit, theme, accentColor, workoutTimerEnabled] = common;
    renderWidget(
      <FocusWidget state={state} unit={unit} theme={theme} accentColor={accentColor} workoutTimerEnabled={workoutTimerEnabled} refreshing={refreshing} />
    );
  };

  if (widgetAction === "WIDGET_ADDED" || widgetAction === "WIDGET_UPDATE" || widgetAction === "WIDGET_RESIZED") {
    const common = await readCommon();
    const state = await resolveWidgetState(storage, common[0]);
    render(state, common);
    return;
  }

  if (widgetAction === "WIDGET_CLICK") {
    const common = await readCommon();
    const exercises = common[0];
    let state;

    if (SET_EDIT_ACTIONS.has(clickAction)) {
      switch (clickAction) {
        case "REPS_PLUS":
          await focusAdjustReps(storage, exercises, clickActionData?.setId, REP_STEP);
          break;
        case "REPS_MINUS":
          await focusAdjustReps(storage, exercises, clickActionData?.setId, -REP_STEP);
          break;
        case "WEIGHT_PLUS":
          await focusAdjustWeight(storage, exercises, clickActionData?.setId, WEIGHT_STEP);
          break;
        case "WEIGHT_MINUS":
          await focusAdjustWeight(storage, exercises, clickActionData?.setId, -WEIGHT_STEP);
          break;
        case "ADD_SET":
          await focusAddSet(storage, exercises, clickActionData?.exerciseId);
          break;
        case "REMOVE_SET":
          await focusRemoveSet(storage, exercises, clickActionData?.setId);
          break;
        case "TOGGLE_WARMUP":
          await focusToggleWarmup(storage, exercises, clickActionData?.setId);
          break;
        case "PREV_STEP":
          await focusNavigateStep(storage, exercises, -1);
          break;
        case "NEXT_STEP":
          await focusNavigateStep(storage, exercises, 1);
          break;
        case "SCROLL_UP":
          await focusScrollSets(storage, exercises, -1);
          break;
        case "SCROLL_DOWN":
          await focusScrollSets(storage, exercises, 1);
          break;
      }
      // Each of these mutates the workout/pointer directly rather than
      // returning a full widget-nav-aware state, so re-resolving is what
      // picks the change back up onto the (still-current) "focus" screen.
      state = await resolveWidgetState(storage, exercises);
      render(state, common);
      return;
    }

    switch (clickAction) {
      case "WEEK_PREV":
        state = await widgetShiftWeek(storage, exercises, -1);
        break;
      case "WEEK_NEXT":
        state = await widgetShiftWeek(storage, exercises, 1);
        break;
      case "SELECT_DAY":
        state = await widgetSelectDay(storage, exercises, clickActionData?.dateKey);
        break;
      case "BACK_TO_WEEK":
        state = await widgetBackToWeek(storage, exercises);
        break;
      case "DAY_PREV":
        state = await widgetShiftDay(storage, exercises, -1);
        break;
      case "DAY_NEXT":
        state = await widgetShiftDay(storage, exercises, 1);
        break;
      case "OPEN_WORKOUT":
        state = await widgetOpenWorkout(storage, exercises, clickActionData?.dateKey, clickActionData?.workoutId);
        break;
      case "START_WORKOUT":
        state = await widgetStartWorkout(storage, exercises, clickActionData?.dateKey);
        break;
      case "END_WORKOUT":
        state = await widgetEndWorkout(storage, exercises);
        break;
      case "RESUME_WORKOUT":
        state = await widgetResumeWorkout(storage, exercises);
        break;
      case "BACK_TO_DAY":
        state = await widgetBackFromFocus(storage, exercises);
        break;
      case "REFRESH_WIDGET":
        state = await resolveWidgetState(storage, exercises);
        render(state, common, true);
        await wait(REFRESH_LABEL_VISIBLE_MS);
        break;
      default:
        state = await resolveWidgetState(storage, exercises);
    }
    render(state, common);
  }
}
