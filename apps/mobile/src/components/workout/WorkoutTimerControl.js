import { Timer } from "lucide-react-native";
import { patchWorkout } from "@barrow/core";
import { useAppState } from "../../state/AppStateProvider";
import { Button } from "../ui/Button";

// Renders bottom-left in Day view and Focus view (see each screen's own
// positioning wrapper) once Preferences > "Workout timer" is switched on and
// no timer is running yet. Once started, this hides — the running-timer
// Card (WorkoutTimerBadge) takes over globally so it stays visible after
// leaving Day/Focus, not just while on one of these two screens.
// `dateKey`/`workoutId` (when the caller has them) let Start stamp
// `startedAt` onto the specific workout being timed, so the summary screen
// can report a duration later — WorkoutTimerStartedAt itself is just a
// global "is a timer running" flag, not tied to any one workout.
export function WorkoutTimerControl({ dateKey, workoutId }) {
  const { workoutTimerEnabled, workoutTimerStartedAt, setWorkoutTimerStartedAt, setWorkouts } = useAppState();

  if (!workoutTimerEnabled || workoutTimerStartedAt) return null;

  return (
    <Button
      label="Start workout"
      onPress={() => {
        const now = Date.now();
        setWorkoutTimerStartedAt(now);
        if (dateKey && workoutId) setWorkouts((cur) => patchWorkout(cur, dateKey, workoutId, { startedAt: now }));
      }}
      variant="solid"
      size="medium"
      icon={<Timer size={14} color="#121214" />}
    />
  );
}
