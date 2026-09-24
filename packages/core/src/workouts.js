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

// Old saved sets used a three-way `side` ("left"/"both"/"right") that was
// just a display label. The new model is two-way ("together"/"separate"),
// where "separate" also splits reps into independent repsLeft/repsRight
// counters (see SplitRepsRow) — "both" maps straight across to "together",
// while "left"/"right" become "separate" with only the matching side's
// counter backfilled from the old single `reps` value (the other side
// wasn't actually trained in that old set, so it starts at 0 rather than
// duplicating reps onto a side that was never done). Left as a no-op for
// anything already on the new values so this stays safe to run on every load.
function migrateSetSide(s) {
  if (s.side === "left") return { ...s, side: "separate", repsLeft: s.reps, repsRight: 0 };
  if (s.side === "right") return { ...s, side: "separate", repsRight: s.reps, repsLeft: 0 };
  if (s.side === "both" || !s.side) return { ...s, side: "together" };
  return s;
}

function migrateSetSides(w) {
  if (!w.entries) return w;
  return { ...w, entries: w.entries.map((e) => (e.sets ? { ...e, sets: e.sets.map(migrateSetSide) } : e)) };
}

// Old saved data had one workout object per date. Wrap it in a one-item
// array (and backfill an id) so every date is uniformly an array from here
// on — this is what lets a browser with pre-multi-workout data load fine.
export function migrateWorkouts(saved) {
  const result = {};
  Object.entries(saved).forEach(([dateKey, value]) => {
    if (Array.isArray(value)) {
      result[dateKey] = value.map((w, i) => migrateSetSides(migrateRoutineIds(w.id ? w : { ...w, id: `w${Date.now()}-${dateKey}-${i}` })));
    } else if (value && typeof value === "object") {
      result[dateKey] = [migrateSetSides(migrateRoutineIds({ ...value, id: value.id || `w${Date.now()}-${dateKey}` }))];
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

// One status per workout in a day, in order: "done" has at least one logged
// set, "empty" has exercises added but no sets yet, "new" has no exercises
// at all. Shared by the in-app calendar grid (one dot per workout) and the
// Android widget's week strip, so the two can't classify a day differently.
export function dayStatusDots(dayWorkouts) {
  return dayWorkouts.map((w) => {
    if (w.entries.some((e) => e.sets.length > 0)) return "done";
    if (w.entries.length > 0) return "empty";
    return "new";
  });
}
