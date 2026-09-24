import { useEffect } from "react";
import { remapExerciseFields, setEntryExcluded, setEntryNote } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { HistoryView } from "../../components/history/HistoryView";

// Mirrors the web app's self-healing effect: if the exercise this screen is
// showing gets deleted (or a cloud restore replaces the whole list) while
// it's open, back out instead of rendering with an undefined exercise.
export function HistoryScreen({ route, navigation }) {
  const { exerciseId } = route.params;
  const { exercises, exerciseNotes, exerciseActions, workouts, setWorkouts, unit } = useAppState();
  const exercise = exercises.find((e) => e.id === exerciseId);

  useEffect(() => {
    if (!exercise) navigation.goBack();
  }, [exercise, navigation]);

  if (!exercise) return null;

  return (
    <HistoryView
      exercise={exercise}
      workouts={workouts}
      unit={unit}
      exerciseNote={exerciseNotes[exerciseId]}
      onChangeExerciseNote={(note) => exerciseActions.setExerciseNote(exerciseId, note)}
      onChangeEntryNote={(dateKey, workoutId, note) => setWorkouts((prev) => setEntryNote(prev, dateKey, workoutId, exerciseId, note))}
      onToggleExcluded={(dateKey, excluded) => setWorkouts((prev) => setEntryExcluded(prev, dateKey, exerciseId, excluded))}
      onSaveFields={(fields, fieldMap) => {
        if (Object.keys(fieldMap).length > 0) setWorkouts((prev) => remapExerciseFields(prev, exerciseId, fieldMap));
        exerciseActions.updateExerciseFields(exercise, fields, exercise.setFormat);
      }}
      onBack={() => navigation.goBack()}
      onOpenFocus={(dateKey, workoutId) => navigation.navigate("ExerciseFocus", { dateKey, workoutId, exerciseId })}
    />
  );
}
