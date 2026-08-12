import { useEffect } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { RoutineDetailView } from "../../components/routines/RoutineDetailView";

// Pushed on top of Routines in the root stack — going back from a Day
// screen opened via "Recent uses" naturally drops back into this screen,
// matching the web app's "routine detail sits under a day view" comment.
export function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const { routines, exercises, workouts, routineActions, exerciseActions, getOrCreateWorkoutForDate } = useAppState();
  const routine = routines.find((r) => r.id === routineId);

  useEffect(() => {
    if (!routine) navigation.goBack();
  }, [routine, navigation]);

  if (!routine) return null;

  return (
    <RoutineDetailView
      routine={routine}
      exercises={exercises}
      workouts={workouts}
      onBack={() => navigation.goBack()}
      onDelete={() => {
        routineActions.deleteRoutine(routine.id);
        navigation.goBack();
      }}
      onRename={routineActions.renameRoutine}
      onSelectDate={(dateKey) => {
        const workoutId = getOrCreateWorkoutForDate(dateKey);
        navigation.navigate("Day", { dateKey, workoutId });
      }}
      onAddExercise={routineActions.addExerciseToRoutine}
      onRemoveExercise={routineActions.removeExerciseFromRoutine}
      onAddCustomExercise={exerciseActions.addCustomExercise}
      onReorderExercise={(draggedExId, targetExId) => routineActions.reorderRoutineExercise(routine.id, draggedExId, targetExId)}
      onCreateSuperset={(exIds) => routineActions.createRoutineSuperset(routine.id, exIds)}
      onUngroupSuperset={(groupIndex) => routineActions.ungroupRoutineSuperset(routine.id, groupIndex)}
    />
  );
}
