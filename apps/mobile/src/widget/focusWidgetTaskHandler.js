import {
  readFocusSnapshot,
  focusAdjustReps,
  focusAdjustWeight,
  focusAddSet,
  focusRemoveSet,
  focusNavigateStep,
  focusToggleWarmup,
} from "@barrow/core";
import { asyncStorageAdapter } from "../state/storage";
import { readExercises, readUnit } from "../state/focusReaders";
import { FocusWidget } from "./FocusWidget";

// This handler runs headless — via Android's HeadlessJsTaskService, with no
// AppStateProvider and often no app process at all (widget taps reach it
// even with the app fully killed). It reads/writes barrow:* AsyncStorage
// keys directly through packages/core's focusStorage module, the same one
// the in-app usePersistedState-backed state ultimately reads/writes to, so
// there's one source of truth regardless of which JS context touched it.

const REP_STEP = 1;
const WEIGHT_STEP = 5;

export async function focusWidgetTaskHandler(props) {
  const { widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetAction === "WIDGET_ADDED" || widgetAction === "WIDGET_UPDATE" || widgetAction === "WIDGET_RESIZED") {
    const [exercises, unit] = await Promise.all([readExercises(), readUnit()]);
    const snapshot = await readFocusSnapshot(asyncStorageAdapter, exercises);
    renderWidget(<FocusWidget snapshot={snapshot} unit={unit} />);
    return;
  }

  if (widgetAction === "WIDGET_CLICK") {
    const [exercises, unit] = await Promise.all([readExercises(), readUnit()]);
    let snapshot;
    switch (clickAction) {
      case "REPS_PLUS":
        snapshot = await focusAdjustReps(asyncStorageAdapter, exercises, clickActionData?.setId, REP_STEP);
        break;
      case "REPS_MINUS":
        snapshot = await focusAdjustReps(asyncStorageAdapter, exercises, clickActionData?.setId, -REP_STEP);
        break;
      case "WEIGHT_PLUS":
        snapshot = await focusAdjustWeight(asyncStorageAdapter, exercises, clickActionData?.setId, WEIGHT_STEP);
        break;
      case "WEIGHT_MINUS":
        snapshot = await focusAdjustWeight(asyncStorageAdapter, exercises, clickActionData?.setId, -WEIGHT_STEP);
        break;
      case "ADD_SET":
        snapshot = await focusAddSet(asyncStorageAdapter, exercises, clickActionData?.exerciseId);
        break;
      case "REMOVE_SET":
        snapshot = await focusRemoveSet(asyncStorageAdapter, exercises, clickActionData?.setId);
        break;
      case "TOGGLE_WARMUP":
        snapshot = await focusToggleWarmup(asyncStorageAdapter, exercises, clickActionData?.setId);
        break;
      case "PREV_STEP":
        snapshot = await focusNavigateStep(asyncStorageAdapter, exercises, -1);
        break;
      case "NEXT_STEP":
        snapshot = await focusNavigateStep(asyncStorageAdapter, exercises, 1);
        break;
      case "REFRESH_WIDGET":
        snapshot = await readFocusSnapshot(asyncStorageAdapter, exercises);
        break;
      default:
        snapshot = await readFocusSnapshot(asyncStorageAdapter, exercises);
    }
    renderWidget(<FocusWidget snapshot={snapshot} unit={unit} />);
  }
}
