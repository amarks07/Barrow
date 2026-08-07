import { useEffect, useRef, useState } from "react";
import { toKey, useWorkoutActions } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { DayView } from "../../components/workout/DayView";
import { WorkoutSummaryView } from "../../components/workout/WorkoutSummaryView";
import { asyncStorageAdapter } from "../../state/storage";
import { refreshFocusWidget } from "../../widget/refreshFocusWidget";
import { refreshFocusNotification } from "../../notification/focusNotification";

const FOCUS_POINTER_KEY = "barrow:focusPointer";

// Past days open to a read-only recap instead of the full editor; "Edit" on
// that recap flips this screen into the normal DayView. Today's date always
// opens directly into the editor. This mirrors the web app's
// isPastDay/pastEditOverride logic — here it's local to the pushed screen
// instead of top-level app state, since navigation now owns "which day".
export function DayScreen({ route, navigation }) {
  const { dateKey, workoutId } = route.params;
  const {
    exercises, templates, unit, workouts, setWorkouts,
    nextId, dayWorkoutsActions, templateActions, exerciseActions, workoutView, focusNotificationEnabled,
  } = useAppState();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState(workoutId);
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
    templates,
    exercises,
    unit,
    nextId,
  });

  // Always holds the latest values for use inside cleanup closures below,
  // which close over whatever was current on the render that registered
  // them — a plain render-body assignment (not useEffect) keeps it current
  // every render with no extra effect.
  const focusNotificationEnabledRef = useRef(focusNotificationEnabled);
  focusNotificationEnabledRef.current = focusNotificationEnabled;
  const trackedWorkoutRef = useRef({ dateKey, workoutId: workout?.id });
  trackedWorkoutRef.current = { dateKey, workoutId: workout?.id };

  // Keeps barrow:focusPointer pointed at whatever workout is open here, so
  // the Android widget/notification can manage it without the user ever
  // stepping into Focus flow — mirrors ExerciseFocusScreen's own pointer
  // writes, but scoped to "this workout is open in Day view" rather than
  // "this exercise is open in Focus view". Only writes when the pointer
  // isn't already tracking this exact workout (e.g. Focus flow, or the
  // widget's own step navigation, already pointed it here), so switching
  // back to Day never resets progress made elsewhere. Read-only past-day
  // summaries are excluded — nothing to manage until "Edit" opens the
  // editor, at which point showSummary flips and this reruns.
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

  // Clears the pointer once the user actually backs all the way out of this
  // day (this screen unmounting) — not when Focus flow is merely pushed on
  // top, since this screen stays mounted underneath in the same
  // native-stack and this cleanup doesn't fire until it's popped too.
  // Guarded to only clear a pointer that still targets THIS workout, so it
  // never clobbers one a different Day screen (e.g. after switching tabs
  // away and a new one being pushed) has since claimed.
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

  // DayView's back button serves double duty: from today's editor, or from
  // a past day reached via the summary's "Edit" button, it should return to
  // the summary instead of leaving the screen. The summary's own back
  // button (below) is simpler — it's only ever shown directly for a past
  // day, so it always leaves. Conflating these into one handler is what
  // made the summary's back button a no-op: it always took the
  // isPastDay branch and reset pastEditOverride to a value it already had,
  // never reaching navigation.goBack().
  const handleEditorBack = () => {
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
      templates={templates}
      unit={unit}
      workouts={workouts}
      onBack={handleEditorBack}
      onSelectWorkout={setSelectedWorkoutId}
      onCreateWorkout={handleCreateWorkout}
      onDeleteWorkout={handleDeleteWorkout}
      onOpenHistory={(exerciseId) => navigation.navigate("History", { exerciseId })}
      onSaveAsTemplate={(dk, wid, name) => templateActions.saveWorkoutAsTemplate(dk, wid, name)}
      onUpdateTemplate={(dk, wid, templateId) => templateActions.updateTemplateFromWorkout(templateId, dk, wid)}
      onAddCustomExercise={exerciseActions.addCustomExercise}
      workoutView={workoutView}
      onOpenExerciseFocus={(exerciseId) => navigation.navigate("ExerciseFocus", { dateKey, workoutId: selectedWorkoutId, exerciseId })}
      {...workoutActions}
    />
  );
}
