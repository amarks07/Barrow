import { useEffect } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { StretchRoutineDetailView } from "../../components/stretch/StretchRoutineDetailView";

// Pushed on top of Stretches, same shape as RoutineDetailScreen over
// Routines — this is where a stretch routine's countdowns actually run.
export function StretchRoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const { exercises, exerciseActions } = useAppState();
  const routine = exercises.find((e) => e.id === routineId && e.type === "stretch");

  useEffect(() => {
    if (!routine) navigation.goBack();
  }, [routine, navigation]);

  if (!routine) return null;

  return (
    <StretchRoutineDetailView
      routine={routine}
      onBack={() => navigation.goBack()}
      onSave={(name, stretches) => exerciseActions.updateStretchRoutine(routine.id, name, stretches)}
      onDelete={() => {
        exerciseActions.deleteExercise(routine.id);
        navigation.goBack();
      }}
    />
  );
}
