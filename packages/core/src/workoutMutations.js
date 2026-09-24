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

import { FIELD_KEYS } from "./fieldDefs";

// Fields whose values are unit-bearing (stored alongside a snapshot of the
// unit system they were entered in — see `updateSet` below) rather than
// unit-agnostic counts.
const UNIT_BEARING_FIELDS = new Set(["weight", "speed", "distance"]);

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
                ...Object.fromEntries(FIELD_KEYS.map((key) => [key, preset?.[key] ?? ""])),
                unit,
                warmup: preset?.warmup ?? false,
                side: preset?.side ?? "together",
              },
            ],
          }
        : e
    ),
  }));
}

// A "separate" set's left/right reps are the source of truth for the UI
// (see SplitRepsRow), but every volume/PR/recommendation calculation in
// analytics.js reads the single `reps` field. Keeping `reps` in sync as
// their sum — right here, the one place both fields ever get written —
// means those calculations (and CSV export, widgets, etc.) need no
// special-casing for split sets at all.
function withRepsSideSynced(s, field, value) {
  const updated = { ...s, [field]: value };
  if (field !== "repsLeft" && field !== "repsRight") return updated;
  const left = parseFloat(updated.repsLeft) || 0;
  const right = parseFloat(updated.repsRight) || 0;
  return { ...updated, reps: left + right };
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
                ? UNIT_BEARING_FIELDS.has(field)
                  ? { ...s, [field]: value, unit }
                  : withRepsSideSynced(s, field, value)
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

// Shallow-merges arbitrary fields onto a workout — used to stamp
// startedAt/endedAt from the workout timer, which (unlike the mutations
// above) isn't scoped to one entry/set.
export function patchWorkout(workouts, dateKey, workoutId, patch) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({ ...w, ...patch }));
}

export function setEntryNote(workouts, dateKey, workoutId, exerciseId, note) {
  return updateWorkout(workouts, dateKey, workoutId, (w) => ({
    ...w,
    entries: w.entries.map((e) => (e.exerciseId === exerciseId ? { ...e, note } : e)),
  }));
}

// True if any logged entry anywhere in `workouts` has a set for
// `exerciseId` — used to decide whether editing an exercise's tracked
// fields needs to prompt about existing history at all.
export function hasHistoryForExercise(workouts, exerciseId) {
  return Object.values(workouts).some((dayWorkouts) =>
    dayWorkouts.some((w) => w.entries.some((e) => e.exerciseId === exerciseId && e.sets.length > 0))
  );
}

// Moves each set's value at `oldKey` onto `newKey` (when given) and clears
// `oldKey`, for every logged set of `exerciseId` across ALL dates — the
// history-migration step of editing which fields an exercise tracks.
// `fieldMap` is `{ [oldKey]: newKeyOrNull }`; a null/undefined newKey just
// discards the old value. Iterates every date like `setEntryExcluded` below,
// rather than one dateKey/workoutId, since this is a one-time bulk rewrite
// of an exercise's entire history, not a single day's edit.
export function remapExerciseFields(workouts, exerciseId, fieldMap) {
  const out = {};
  Object.entries(workouts).forEach(([dateKey, dayWorkouts]) => {
    out[dateKey] = dayWorkouts.map((w) => ({
      ...w,
      entries: w.entries.map((e) => {
        if (e.exerciseId !== exerciseId) return e;
        return {
          ...e,
          sets: e.sets.map((s) => {
            const next = { ...s };
            Object.entries(fieldMap).forEach(([oldKey, newKey]) => {
              if (newKey) next[newKey] = s[oldKey];
              next[oldKey] = "";
            });
            return next;
          }),
        };
      }),
    }));
  });
  return out;
}

// Marks every entry for `exerciseId` across ALL of a day's workouts as
// excluded (or included) from that exercise's progress graphs. Scoped to
// the whole date rather than one workoutId because a day's volume/distance
// point on the chart is already the sum across every workout logged that
// day (see getVolumeSeries/getCardioDistanceSeries in analytics.js) — the
// history screen's per-day toggle needs to hide the whole point, not just
// one workout's contribution to it.
export function setEntryExcluded(workouts, dateKey, exerciseId, excluded) {
  const dayWorkouts = workouts[dateKey];
  if (!dayWorkouts) return workouts;
  return {
    ...workouts,
    [dateKey]: dayWorkouts.map((w) => ({
      ...w,
      entries: w.entries.map((e) => (e.exerciseId === exerciseId ? { ...e, excluded } : e)),
    })),
  };
}
