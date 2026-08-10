import { useEffect, useRef, useState } from "react";
import PagerView from "react-native-pager-view";
import { useIsFocused } from "@react-navigation/native";
import { addDays, toKey, useWorkoutActions } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { DayView } from "../../components/workout/DayView";
import { WorkoutSummaryView } from "../../components/workout/WorkoutSummaryView";
import { asyncStorageAdapter } from "../../state/storage";
import { refreshFocusWidget } from "../../widget/refreshFocusWidget";
import { refreshFocusNotification } from "../../notification/focusNotification";

const FOCUS_POINTER_KEY = "barrow:focusPointer";

// One day's worth of what used to be DayScreen's whole body — pulled out so
// DayScreen can mount three of these (yesterday/today/tomorrow relative to
// whichever date is centered) side by side inside a PagerView, the same
// native pager both the home tabs (via material-top-tabs) and Focus flow
// (ExerciseFocusView) already swipe through. `isActive` is true only for
// the centered page — the neighbors exist purely so the pager has adjacent
// content to reveal mid-swipe, and stay inert (no focus-pointer writes, no
// auto-created workout) until a swipe actually lands on them.
function DayPanel({
  dateKey, isActive, initialWorkoutId, navigation,
  exercises, routines, unit, workouts, setWorkouts,
  nextId, dayWorkoutsActions, routineActions, exerciseActions, workoutView, focusNotificationEnabled,
  plateCalculatorEnabled, stretchRoutinesEnabled, workoutTimerEnabled, workoutTimerStartedAt,
  getOrCreateWorkoutForDate,
}) {
  // True only while DayScreen itself is the screen on top — false once
  // Focus flow is pushed over it. Guards the pointer effects below so they
  // never fight Focus flow for ownership of barrow:focusPointer while it's
  // open (see comments there).
  const screenFocused = useIsFocused();
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

  // A page that becomes active with nothing logged yet gets a workout ready
  // immediately — same "resume latest, or start fresh" rule as opening a
  // day from the calendar — but only once it's actually the one on screen,
  // not merely a pre-rendered neighbor (otherwise idly swiping past empty
  // future days would litter them with blank workouts).
  useEffect(() => {
    if (!isActive || dayWorkouts.length > 0) return;
    setSelectedWorkoutId(getOrCreateWorkoutForDate(dateKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, dateKey, dayWorkouts.length]);

  // Always holds the latest values for use inside cleanup closures below,
  // which close over whatever was current on the render that registered
  // them — a plain render-body assignment (not useEffect) keeps it current
  // every render with no extra effect.
  const focusNotificationEnabledRef = useRef(focusNotificationEnabled);
  focusNotificationEnabledRef.current = focusNotificationEnabled;
  const workoutTimerEnabledRef = useRef(workoutTimerEnabled);
  workoutTimerEnabledRef.current = workoutTimerEnabled;
  const workoutTimerStartedAtRef = useRef(workoutTimerStartedAt);
  workoutTimerStartedAtRef.current = workoutTimerStartedAt;
  const trackedWorkoutRef = useRef({ dateKey, workoutId: workout?.id });
  trackedWorkoutRef.current = { dateKey, workoutId: workout?.id };
  // Latest dayWorkouts for the unmount cleanup below, which fires from a
  // closure captured at mount time otherwise. wasActiveRef only latches once
  // this page has actually been the centered one — a neighbor pre-rendered
  // by the pager but never swiped to shouldn't have its (possibly
  // pre-existing) empty workout deleted just because the window moved on.
  const dayWorkoutsRef = useRef(dayWorkouts);
  dayWorkoutsRef.current = dayWorkouts;
  const wasActiveRef = useRef(isActive);
  if (isActive) wasActiveRef.current = true;

  const cleanupEmptyWorkouts = (list) => {
    list.forEach((w) => {
      if (w.entries.length === 0) dayWorkoutsActions.deleteWorkout(dateKey, w.id);
    });
  };

  // Drops any workout left with no exercises once the user actually leaves
  // this day, so an abandoned "+ new workout" tab (or the auto-created one
  // from opening the day at all) doesn't linger as clutter on the calendar.
  useEffect(
    () => () => {
      if (wasActiveRef.current) cleanupEmptyWorkouts(dayWorkoutsRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Keeps barrow:focusPointer pointed at whatever workout is open here, so
  // the Android widget/notification can manage it without the user ever
  // stepping into Focus flow — mirrors ExerciseFocusScreen's own pointer
  // writes, but scoped to "this workout is open in Day view" rather than
  // "this exercise is open in Focus view". The notification is meant to
  // track either Focus flow or an actively-timed workout, not Day view in
  // general, so this only fires once the workout timer feature is on and
  // actually started (see WorkoutTimerControl) — merely opening a day with
  // logged sets doesn't, on its own, earn a notification. screenFocused
  // keeps this from firing while Focus flow is pushed on top of this same
  // Day screen, so it never fights Focus flow for ownership of the pointer.
  // Only writes when the pointer isn't already tracking this exact workout
  // (e.g. Focus flow already pointed it here), so switching back to Day
  // never resets progress made elsewhere. Read-only past-day summaries —
  // and non-active neighbor pages sitting off-screen in the pager — are
  // excluded — nothing to manage there until this page is actually the one
  // on screen.
  useEffect(() => {
    const timerRunning = workoutTimerEnabled && !!workoutTimerStartedAt;
    if (!isActive || !screenFocused || showSummary || !workout || entries.length === 0 || !timerRunning) return;
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
  }, [isActive, screenFocused, dateKey, workout?.id, entries.length, showSummary, workoutTimerEnabled, workoutTimerStartedAt]);

  // Drops the pointer the instant the timer that earned it stops (e.g. "End
  // workout" tapped from Day view), so the notification doesn't linger for
  // a workout that's no longer either open in Focus flow or actively timed.
  // Also scoped to screenFocused so this never fires while Focus flow is
  // the one actually holding the pointer — ending the timer from there
  // shouldn't drop a notification Focus flow's own presence still earns.
  useEffect(() => {
    const timerRunning = workoutTimerEnabled && !!workoutTimerStartedAt;
    if (!isActive || !screenFocused || timerRunning || !workout) return;
    let cancelled = false;
    asyncStorageAdapter
      .getItem(FOCUS_POINTER_KEY)
      .then((raw) => {
        if (cancelled) return;
        const existing = raw ? JSON.parse(raw) : null;
        if (!existing || existing.dateKey !== dateKey || existing.workoutId !== workout.id) return;
        return asyncStorageAdapter.removeItem(FOCUS_POINTER_KEY).then(() => {
          refreshFocusWidget().catch((e) => console.error("Barrow: failed to refresh focus widget", e));
          if (focusNotificationEnabledRef.current === "on") {
            refreshFocusNotification().catch((e) => console.error("Barrow: failed to refresh focus notification", e));
          }
        });
      })
      .catch((e) => console.error("Barrow: failed to clear barrow:focusPointer", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, screenFocused, dateKey, workout?.id, workoutTimerEnabled, workoutTimerStartedAt]);

  // Clears the pointer once the user actually backs all the way out of this
  // day (this panel unmounting) — guarded to only clear a pointer that
  // still targets THIS workout, so a neighbor panel that never actually
  // wrote the pointer (see isActive guard above) can't clobber whichever
  // panel did. Skipped while the workout timer is still running (read via
  // ref, since this closure is captured at mount) — leaving the day, or
  // swiping it out of the pager's 3-day window, shouldn't kill the
  // notification for a workout still actively in progress; only ending the
  // timer (handled above) or its own timer-stop effect does that.
  useEffect(
    () => () => {
      if (workoutTimerEnabledRef.current && workoutTimerStartedAtRef.current) return;
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
    // Covers the isPastDay branch, which flips back to the summary in place
    // rather than unmounting this panel — the unmount effect above wouldn't
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
      stretchRoutinesEnabled={stretchRoutinesEnabled}
      workoutView={workoutView}
      plateCalculatorEnabled={plateCalculatorEnabled}
      onOpenExerciseFocus={(exerciseId) => navigation.navigate("ExerciseFocus", { dateKey, workoutId: selectedWorkoutId, exerciseId })}
      {...workoutActions}
    />
  );
}

// Past days open to a read-only recap instead of the full editor; "Edit" on
// that recap flips this screen into the normal DayView. Today's date always
// opens directly into the editor. This mirrors the web app's
// isPastDay/pastEditOverride logic — here it's local to each DayPanel
// instead of top-level app state, since navigation now owns "which day".
export function DayScreen({ route, navigation }) {
  const { dateKey: initialDateKey, workoutId: initialWorkoutId } = route.params;
  const {
    exercises, routines, unit, workouts, setWorkouts,
    nextId, dayWorkoutsActions, routineActions, exerciseActions, workoutView, focusNotificationEnabled,
    plateCalculatorEnabled, stretchRoutinesEnabled, workoutTimerEnabled, workoutTimerStartedAt,
    getOrCreateWorkoutForDate,
  } = useAppState();

  const [centerDateKey, setCenterDateKey] = useState(initialDateKey);
  const windowKeys = [addDays(centerDateKey, -1), centerDateKey, addDays(centerDateKey, 1)];
  const pagerRef = useRef(null);

  const onPageSelected = (e) => {
    const position = e.nativeEvent.position;
    if (position === 1) return;
    setCenterDateKey((cur) => addDays(cur, position - 1));
  };

  // react-native-pager-view tracks "current page" by native index, not by
  // which key is mounted there, so shifting the 3-day window in place would
  // leave the pager parked on the wrong content once the array shifts under
  // it. Snapping back to the middle page (without animating) once the new
  // window has rendered fixes that — and, unlike remounting the whole
  // PagerView on every swipe, it keeps the native view alive across the
  // gesture, so the swipe decelerates into place instead of hard-cutting to
  // a freshly mounted pager (which read as an aggressive "click").
  useEffect(() => {
    pagerRef.current?.setPageWithoutAnimation(1);
  }, [centerDateKey]);

  return (
    <PagerView ref={pagerRef} style={{ flex: 1 }} initialPage={1} onPageSelected={onPageSelected}>
      {windowKeys.map((dateKey) => (
        <DayPanel
          key={dateKey}
          dateKey={dateKey}
          isActive={dateKey === centerDateKey}
          initialWorkoutId={dateKey === initialDateKey ? initialWorkoutId : undefined}
          navigation={navigation}
          exercises={exercises}
          routines={routines}
          unit={unit}
          workouts={workouts}
          setWorkouts={setWorkouts}
          nextId={nextId}
          dayWorkoutsActions={dayWorkoutsActions}
          routineActions={routineActions}
          exerciseActions={exerciseActions}
          workoutView={workoutView}
          focusNotificationEnabled={focusNotificationEnabled}
          plateCalculatorEnabled={plateCalculatorEnabled}
          stretchRoutinesEnabled={stretchRoutinesEnabled}
          workoutTimerEnabled={workoutTimerEnabled}
          workoutTimerStartedAt={workoutTimerStartedAt}
          getOrCreateWorkoutForDate={getOrCreateWorkoutForDate}
        />
      ))}
    </PagerView>
  );
}
