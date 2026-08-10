// A day can hold more than one workout, so `workouts` is keyed by date to an
// array of them (each with its own id) rather than a single workout object.

// Old saved data tagged a workout with the ids of the templates (now
// routines) it was built from under `templateIds`. Renames that field to
// `routineIds` in place so old saves keep working under the new name.
function migrateRoutineIds(w) {
  if (w.routineIds || !w.templateIds) return w;
  const { templateIds, ...rest } = w;
  return { ...rest, routineIds: templateIds };
}

// Old saved data had one workout object per date. Wrap it in a one-item
// array (and backfill an id) so every date is uniformly an array from here
// on — this is what lets a browser with pre-multi-workout data load fine.
export function migrateWorkouts(saved) {
  const result = {};
  Object.entries(saved).forEach(([dateKey, value]) => {
    if (Array.isArray(value)) {
      result[dateKey] = value.map((w, i) => migrateRoutineIds(w.id ? w : { ...w, id: `w${Date.now()}-${dateKey}-${i}` }));
    } else if (value && typeof value === "object") {
      result[dateKey] = [migrateRoutineIds({ ...value, id: value.id || `w${Date.now()}-${dateKey}` })];
    }
  });
  return result;
}

// Every workout across every day, most recent first — same-day workouts
// ordered later-added first. Centralizes the "flatten the day arrays" step
// that recommendations, volume history, etc. all need.
export function flattenWorkouts(workouts) {
  return Object.entries(workouts)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .flatMap(([dateKey, dayWorkouts]) => [...dayWorkouts].reverse().map((workout) => ({ dateKey, workout })));
}
