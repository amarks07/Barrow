import { useEffect, useRef } from "react";
import { useWorkoutActions } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { ExerciseFocusView } from "../../components/workout/ExerciseFocusView";
import { asyncStorageAdapter } from "../../state/storage";
import { refreshFocusWidget } from "../../widget/refreshFocusWidget";
import { refreshFocusNotification } from "../../notification/focusNotification";

const FOCUS_POINTER_KEY = "barrow:focusPointer";
const POINTER_SAVE_DEBOUNCE_MS = 400;

export function ExerciseFocusScreen({ route, navigation }) {
  const { dateKey, workoutId, exerciseId, focusSetId, focusField } = route.params;
  const { exercises, templates, unit, workouts, setWorkouts, nextId, focusSupersetGrouping, focusNotificationEnabled } = useAppState();

  const workoutActions = useWorkoutActions({
    selectedDate: dateKey,
    selectedWorkoutId: workoutId,
    setWorkouts,
    templates,
    exercises,
    unit,
    nextId,
  });

  // Persists "what's currently open in Focus flow" to barrow:focusPointer,
  // debounced like usePersistedState's own saves (coalesces rapid pager
  // swipes into one write) — so the Android widget/notification know what
  // to render even with the app backgrounded or killed. Fires on mount and
  // on every step change; cleared on unmount (back button, hardware back,
  // navigating elsewhere) so the widget/notification drop back to their
  // empty state the moment the user actually leaves Focus flow, rather
  // than continuing to show whatever exercise was last on screen. A widget/
  // notification tap that re-targets this same screen instance to a
  // different exercise updates route.params in place instead of
  // unmounting (see the ExerciseFocusView key comment below), so normal
  // in-workout navigation never trips this.
  const pointerTimeout = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(pointerTimeout.current);
      asyncStorageAdapter
        .removeItem(FOCUS_POINTER_KEY)
        .then(() => {
          refreshFocusWidget().catch((e) => console.error("Barrow: failed to refresh focus widget", e));
          if (focusNotificationEnabled === "on") {
            refreshFocusNotification().catch((e) => console.error("Barrow: failed to refresh focus notification", e));
          }
        })
        .catch((e) => console.error("Barrow: failed to clear barrow:focusPointer", e));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onStepChange = (step) => {
    const primaryExerciseId = step[0]?.exerciseId;
    if (!primaryExerciseId) return;
    clearTimeout(pointerTimeout.current);
    pointerTimeout.current = setTimeout(() => {
      const pointer = { dateKey, workoutId, exerciseId: primaryExerciseId, updatedAt: Date.now() };
      asyncStorageAdapter
        .setItem(FOCUS_POINTER_KEY, JSON.stringify(pointer))
        .catch((e) => console.error("Barrow: failed to save barrow:focusPointer", e));
    }, POINTER_SAVE_DEBOUNCE_MS);
  };

  return (
    <ExerciseFocusView
      // Keyed on the route params that identify which workout/exercise is
      // being focused: a stale-notification or widget tap re-navigates this
      // same screen instance to a different workout via
      // navigationRef.navigate (React Navigation updates route.params in
      // place instead of pushing a new screen when it's already focused).
      // Without a key, ExerciseFocusView's activeIndex state and the
      // PagerView's native current-page index survive that param change
      // unchanged, so they can point past the end of the new workout's
      // (possibly shorter) step list — swiping the pager then walks off the
      // end of its own children and crashes. Forcing a remount here instead
      // guarantees the pager always starts fresh and in bounds. Also keyed
      // on focusSetId/focusField so a second widget deep-link tap (e.g. a
      // different set's weight) while this same exercise is already open
      // still forces a remount — otherwise React Navigation's in-place
      // param update wouldn't retrigger the one-shot autoFocus below.
      key={`${dateKey}:${workoutId}:${exerciseId}:${focusSetId || ""}:${focusField || ""}`}
      dayWorkouts={workouts[dateKey] || []}
      activeWorkoutId={workoutId}
      initialExerciseId={exerciseId}
      exercises={exercises}
      unit={unit}
      workouts={workouts}
      onBack={() => navigation.goBack()}
      onSetAngle={workoutActions.onSetAngle}
      onAddSet={workoutActions.onAddSet}
      onUpdateSet={workoutActions.onUpdateSet}
      onRemoveSet={workoutActions.onRemoveSet}
      onStepChange={onStepChange}
      groupSupersets={focusSupersetGrouping !== "separate"}
      focusSetId={focusSetId}
      focusField={focusField}
    />
  );
}
