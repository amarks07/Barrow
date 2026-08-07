// Pure, framework-free transforms over the whole `{ dateKey: Workout[] }`
// map. Extracted out of useWorkoutActions.js so the exact same logic runs
// both from a React setState updater (in-app edits) and from a headless JS
// context with no React at all (widget/notification button taps writing
// straight to AsyncStorage) — one implementation, no risk of the two paths
// drifting apart.
//
// Every function bails out and returns the same `workouts` reference
// unchanged if the dateKey/workoutId/exerciseId/setId it's targeting no
// longer exists, mirroring useWorkoutActions' ensureWorkout no-op-on-miss
// behavior (the day/workout/set may have been deleted from another
// context since the caller last read it).

function updateWorkout(workouts, dateKey, workoutId, updater) {
  const dayWorkouts = workouts[dateKey] || [];
  const idx = dayWorkouts.findIndex((w) => w.id === workoutId);
  if (idx === -1) return workouts;
  const updated = [...dayWorkouts];
  updated[idx] = updater(updated[idx]);
  return { ...workouts, [dateKey]: updated };
}

// `Date.now()` collisions are already unlikely within one JS context (the
// closure-counter scheme this replaces existed to rule those out), but a
// headless task (widget tap, notification action) runs in a separate JS VM
// from the foregrounded app with its own counter starting back at 0 — two
// ids minted in the same millisecond from two different contexts could
// otherwise collide. A random suffix instead of a shared counter can't
// collide across contexts by construction.
export function generateId() {
  return `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function setAngle(workouts, dateKey, workoutId, exerciseId, angle) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({
    ...w,
    entries: w.entries.map((e) => (e.exerciseId === exerciseId ? { ...e, angle } : e)),
  }));
}

export function addSet(workouts, dateKey, workoutId, exerciseId, nextId, preset, unit) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({
    ...w,
    entries: w.entries.map((e) =>
      e.exerciseId === exerciseId
        ? {
            ...e,
            sets: [
              ...e.sets,
              {
                id: nextId(),
                reps: preset?.reps ?? "",
                weight: preset?.weight ?? "",
                time: preset?.time ?? "",
                speed: preset?.speed ?? "",
                unit,
                warmup: false,
              },
            ],
          }
        : e
    ),
  }));
}

export function updateSet(workouts, dateKey, workoutId, exerciseId, setId, field, value, unit) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({
    ...w,
    entries: w.entries.map((e) =>
      e.exerciseId === exerciseId
        ? {
            ...e,
            sets: e.sets.map((s) =>
              s.id === setId
                ? field === "weight" || field === "speed"
                  ? { ...s, [field]: value, unit }
                  : { ...s, [field]: value }
                : s
            ),
          }
        : e
    ),
  }));
}

export function removeSet(workouts, dateKey, workoutId, exerciseId, setId) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({
    ...w,
    entries: w.entries.map((e) => (e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)),
  }));
}

export function setEntryNote(workouts, dateKey, workoutId, exerciseId, note) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({
    ...w,
    entries: w.entries.map((e) => (e.exerciseId === exerciseId ? { ...e, note } : e)),
  }));
}
