import { useEffect, useRef, useState } from "react";
import { toKey, useWorkoutActions } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { DayView } from "../../components/workout/DayView";
import { WorkoutSummaryView } from "../../components/workout/WorkoutSummaryView";
import { asyncStorageAdapter } from "../../state/storage";
import { refreshFocusWidget } from "../../widget/refreshFocusWidget";
import { refreshFocusNotification } from "../../notification/focusNotification";

const FOCUS_POINTER_KEY = "barrow:focusPointer";

// Web has no react-native-pager-view (it imports native-only RN internals
// that don't bundle for web — see PagerViewNativeComponent.ts), so this
// mirrors DayScreen.js but renders only the centered day instead of a
// swipeable yesterday/today/tomorrow pager. There's no adjacent-day swipe
// on web — getting to a different day means going back to the calendar.
export function DayScreen({ route, navigation }) {
  const { dateKey, workoutId: initialWorkoutId } = route.params;
  const {
    exercises, routines, unit, workouts, setWorkouts,
    nextId, dayWorkoutsActions, routineActions, exerciseActions, workoutView, focusNotificationEnabled,
    plateCalculatorEnabled,
    getOrCreateWorkoutForDate,
  } = useAppState();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState(initialWorkoutId ?? null);
  const [pastEditOverride, setPastEditOverride] = useState(false);

  const dayWorkouts = workouts[dateKey] || [];
  const isPastDay = dateKey < toKey(new Date());
  const showSummary = isPastDay && !pastEditOverride;
  const workout = dayWorkouts.find((w) => w.id === selectedWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];

  const workoutActions = useWorkoutActions({
    selectedDate: dateKey,
    selectedWorkoutId,
    setWorkouts,
    routines,
    exercises,
    unit,
    nextId,
  });

  useEffect(() => {
    if (dayWorkouts.length > 0) return;
    setSelectedWorkoutId(getOrCreateWorkoutForDate(dateKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, dayWorkouts.length]);

  const focusNotificationEnabledRef = useRef(focusNotificationEnabled);
  focusNotificationEnabledRef.current = focusNotificationEnabled;
  const trackedWorkoutRef = useRef({ dateKey, workoutId: workout?.id });
  trackedWorkoutRef.current = { dateKey, workoutId: workout?.id };
  // Latest dayWorkouts for the unmount cleanup below, which fires from a
  // closure captured at mount time otherwise.
  const dayWorkoutsRef = useRef(dayWorkouts);
  dayWorkoutsRef.current = dayWorkouts;

  const cleanupEmptyWorkouts = (list) => {
    list.forEach((w) => {
      if (w.entries.length === 0) dayWorkoutsActions.deleteWorkout(dateKey, w.id);
    });
  };

  // Drops any workout left with no exercises once the user actually leaves
  // this day, so an abandoned "+ new workout" tab (or the auto-created one
  // from opening the day at all) doesn't linger as clutter on the calendar.
  useEffect(
    () => () => cleanupEmptyWorkouts(dayWorkoutsRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (showSummary || !workout || entries.length === 0) return;
    let cancelled = false;
    asyncStorageAdapter
      .getItem(FOCUS_POINTER_KEY)
      .then((raw) => {
        if (cancelled) return;
        const existing = raw ? JSON.parse(raw) : null;
        if (existing && existing.dateKey === dateKey && existing.workoutId === workout.id) return;
        const pointer = { dateKey, workoutId: workout.id, exerciseId: entries[0].exerciseId, updatedAt: Date.now() };
        return asyncStorageAdapter.setItem(FOCUS_POINTER_KEY, JSON.stringify(pointer)).then(() => {
          refreshFocusWidget().catch((e) => console.error("Barrow: failed to refresh focus widget", e));
          if (focusNotificationEnabledRef.current === "on") {
            refreshFocusNotification().catch((e) => console.error("Barrow: failed to refresh focus notification", e));
          }
        });
      })
      .catch((e) => console.error("Barrow: failed to save barrow:focusPointer", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, workout?.id, entries.length, showSummary]);

  useEffect(
    () => () => {
      const { dateKey: trackedDateKey, workoutId: trackedWorkoutId } = trackedWorkoutRef.current;
      asyncStorageAdapter
        .getItem(FOCUS_POINTER_KEY)
        .then((raw) => {
          const existing = raw ? JSON.parse(raw) : null;
          if (!existing || existing.dateKey !== trackedDateKey || existing.workoutId !== trackedWorkoutId) return;
          return asyncStorageAdapter.removeItem(FOCUS_POINTER_KEY).then(() => {
            refreshFocusWidget().catch((e) => console.error("Barrow: failed to refresh focus widget", e));
            if (focusNotificationEnabledRef.current === "on") {
              refreshFocusNotification().catch((e) => console.error("Barrow: failed to refresh focus notification", e));
            }
          });
        })
        .catch((e) => console.error("Barrow: failed to clear barrow:focusPointer", e));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleEditorBack = () => {
    // Covers the isPastDay branch, which flips back to the summary in place
    // rather than unmounting this screen — the unmount effect above wouldn't
    // fire for it. Also runs here (redundantly but harmlessly) on the
    // navigate-away branch, since that unmount can lag a frame behind.
    cleanupEmptyWorkouts(dayWorkouts);
    if (isPastDay) setPastEditOverride(false);
    else navigation.goBack();
  };

  const handleSummaryBack = () => {
    navigation.goBack();
  };

  const handleCreateWorkout = () => setSelectedWorkoutId(dayWorkoutsActions.createWorkout(dateKey));

  const handleDeleteWorkout = (id) => {
    dayWorkoutsActions.deleteWorkout(dateKey, id);
    const remaining = dayWorkouts.filter((w) => w.id !== id);
    setSelectedWorkoutId(remaining[0]?.id ?? null);
  };

  if (showSummary) {
    return (
      <WorkoutSummaryView
        dateKey={dateKey}
        dayWorkouts={dayWorkouts}
        activeWorkoutId={selectedWorkoutId}
        exercises={exercises}
        unit={unit}
        onBack={handleSummaryBack}
        onSelectWorkout={setSelectedWorkoutId}
        onEdit={() => setPastEditOverride(true)}
      />
    );
  }

  return (
    <DayView
      dateKey={dateKey}
      dayWorkouts={dayWorkouts}
      activeWorkoutId={selectedWorkoutId}
      exercises={exercises}
      routines={routines}
      unit={unit}
      workouts={workouts}
      onBack={handleEditorBack}
      onSelectWorkout={setSelectedWorkoutId}
      onCreateWorkout={handleCreateWorkout}
      onDeleteWorkout={handleDeleteWorkout}
      onOpenHistory={(exerciseId) => navigation.navigate("History", { exerciseId })}
      onOpenSummary={(workoutId) => navigation.navigate("WorkoutSummary", { dateKey, workoutId })}
      onSaveAsRoutine={(dk, wid, name) => routineActions.saveWorkoutAsRoutine(dk, wid, name)}
      onUpdateRoutine={(dk, wid, routineId) => routineActions.updateRoutineFromWorkout(routineId, dk, wid)}
      onAddCustomExercise={exerciseActions.addCustomExercise}
      workoutView={workoutView}
      plateCalculatorEnabled={plateCalculatorEnabled}
      onOpenExerciseFocus={(exerciseId) => navigation.navigate("ExerciseFocus", { dateKey, workoutId: selectedWorkoutId, exerciseId })}
      {...workoutActions}
    />
  );
}
