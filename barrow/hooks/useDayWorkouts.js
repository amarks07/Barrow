"use client";

// Create/delete whole workouts for a day — as opposed to useWorkoutActions,
// which mutates the exercises/sets *within* one already-selected workout.
export function useDayWorkouts({ setWorkouts, nextId }) {
  const createWorkout = (dateKey) => {
    const id = nextId();
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), { id, name: "Workout", entries: [], templateIds: [] }],
    }));
    return id;
  };

  const deleteWorkout = (dateKey, workoutId) =>
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((w) => w.id !== workoutId),
    }));

  return { createWorkout, deleteWorkout };
}
