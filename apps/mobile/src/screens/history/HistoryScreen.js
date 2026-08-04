import { useEffect } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { HistoryView } from "../../components/history/HistoryView";

// Mirrors the web app's self-healing effect: if the exercise this screen is
// showing gets deleted (or a cloud restore replaces the whole list) while
// it's open, back out instead of rendering with an undefined exercise.
export function HistoryScreen({ route, navigation }) {
  const { exerciseId } = route.params;
  const { exercises, workouts, unit } = useAppState();
  const exercise = exercises.find((e) => e.id === exerciseId);

  useEffect(() => {
    if (!exercise) navigation.goBack();
  }, [exercise, navigation]);

  if (!exercise) return null;

  return <HistoryView exercise={exercise} workouts={workouts} unit={unit} onBack={() => navigation.goBack()} />;
}
