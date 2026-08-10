import { useAppState } from "../../state/AppStateProvider";
import { WorkoutStatsView } from "../../components/workout/WorkoutStatsView";

export function WorkoutSummaryScreen({ route, navigation }) {
  const { dateKey, workoutId } = route.params;
  const { exercises, workouts, unit } = useAppState();

  return (
    <WorkoutStatsView
      dateKey={dateKey}
      dayWorkouts={workouts[dateKey] || []}
      activeWorkoutId={workoutId}
      exercises={exercises}
      workouts={workouts}
      unit={unit}
      onBack={() => navigation.goBack()}
    />
  );
}
