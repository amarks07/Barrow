import { useWorkoutActions } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { ExerciseFocusView } from "../../components/workout/ExerciseFocusView";

export function ExerciseFocusScreen({ route, navigation }) {
  const { dateKey, workoutId, exerciseId } = route.params;
  const { exercises, templates, unit, workouts, setWorkouts, nextId, focusSupersetGrouping } = useAppState();

  const workoutActions = useWorkoutActions({
    selectedDate: dateKey,
    selectedWorkoutId: workoutId,
    setWorkouts,
    templates,
    exercises,
    unit,
    nextId,
  });

  return (
    <ExerciseFocusView
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
      groupSupersets={focusSupersetGrouping !== "separate"}
    />
  );
}
