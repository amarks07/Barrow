import { useState } from "react";
import { toKey, useWorkoutActions } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { DayView } from "../../components/workout/DayView";
import { WorkoutSummaryView } from "../../components/workout/WorkoutSummaryView";

// Past days open to a read-only recap instead of the full editor; "Edit" on
// that recap flips this screen into the normal DayView. Today's date always
// opens directly into the editor. This mirrors the web app's
// isPastDay/pastEditOverride logic — here it's local to the pushed screen
// instead of top-level app state, since navigation now owns "which day".
export function DayScreen({ route, navigation }) {
  const { dateKey, workoutId } = route.params;
  const {
    exercises, templates, unit, workouts, setWorkouts,
    nextId, dayWorkoutsActions, templateActions, exerciseActions, workoutView,
  } = useAppState();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState(workoutId);
  const [pastEditOverride, setPastEditOverride] = useState(false);

  const dayWorkouts = workouts[dateKey] || [];
  const isPastDay = dateKey < toKey(new Date());
  const showSummary = isPastDay && !pastEditOverride;

  const workoutActions = useWorkoutActions({
    selectedDate: dateKey,
    selectedWorkoutId,
    setWorkouts,
    templates,
    exercises,
    unit,
    nextId,
  });

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
      onAddCustomExercise={exerciseActions.addCustomExercise}
      workoutView={workoutView}
      onOpenExerciseFocus={(exerciseId) => navigation.navigate("ExerciseFocus", { dateKey, workoutId: selectedWorkoutId, exerciseId })}
      {...workoutActions}
    />
  );
}
