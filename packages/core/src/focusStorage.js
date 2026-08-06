// Async, storage-adapter-injected layer over the Focus flow's persisted
// state (barrow:workouts / barrow:focusPointer / barrow:focusSupersetGrouping
// / barrow:unit), used directly by the Android widget/notification headless
// handlers — contexts with no React and no AppStateProvider. Takes the same
// `{ getItem, setItem }` storage adapter shape usePersistedState expects
// (apps/mobile's asyncStorageAdapter), so it stays platform-agnostic and
// import-safe from packages/core like everything else here.
//
// All mutations here act on ONE explicit set (by id) or ONE explicit
// exercise (by id) — never an implicit "current"/"active" set — since a
// widget/notification button's clickActionData always carries the specific
// id it was rendered for.

import { buildSteps } from "./focusSteps";
import { migrateWorkouts } from "./workouts";
import * as mutations from "./workoutMutations";

const WORKOUTS_KEY = "barrow:workouts";
const FOCUS_POINTER_KEY = "barrow:focusPointer";
const SUPERSET_GROUPING_KEY = "barrow:focusSupersetGrouping";
const UNIT_KEY = "barrow:unit";

async function readWorkouts(storage) {
  const raw = await storage.getItem(WORKOUTS_KEY);
  return raw ? migrateWorkouts(JSON.parse(raw)) : {};
}

async function writeWorkouts(storage, workouts) {
  await storage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
}

async function readFocusPointer(storage) {
  const raw = await storage.getItem(FOCUS_POINTER_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function readGroupSupersets(storage) {
  const raw = await storage.getItem(SUPERSET_GROUPING_KEY);
  return raw !== "separate"; // default "together", matches AppStateProvider's default
}

async function readUnit(storage) {
  const raw = await storage.getItem(UNIT_KEY);
  return raw || "lb";
}

function findExerciseIdForSet(workout, setId) {
  const entry = workout.entries.find((e) => e.sets.some((s) => s.id === setId));
  return entry ? entry.exerciseId : null;
}

function findSet(workout, setId) {
  for (const entry of workout.entries) {
    const set = entry.sets.find((s) => s.id === setId);
    if (set) return set;
  }
  return null;
}

// Resolves a focus pointer against a workouts map into exactly what a
// widget/notification needs to render one screen: the current step's
// identity, position, and every set on every exercise in that step (a
// superset step has more than one exercise, each with its own sets).
// Returns null if the pointer no longer resolves to anything real (workout
// or exercise deleted from elsewhere, day rolled over) so callers can show
// an empty state instead of stale/wrong data.
function resolveSnapshot(workouts, pointer, groupSupersets, exercises) {
  if (!pointer) return null;
  const dayWorkouts = workouts[pointer.dateKey] || [];
  const workout = dayWorkouts.find((w) => w.id === pointer.workoutId);
  if (!workout) return null;
  const steps = buildSteps(workout.entries, groupSupersets);
  if (steps.length === 0) return null;
  const foundIndex = steps.findIndex((step) => step.some((e) => e.exerciseId === pointer.exerciseId));
  const stepIndex = foundIndex === -1 ? 0 : foundIndex;
  const activeStep = steps[stepIndex];
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const title = activeStep.map((e) => exMap[e.exerciseId]?.name).filter(Boolean).join(" + ") || "Exercise";
  return {
    dateKey: pointer.dateKey,
    workoutId: pointer.workoutId,
    stepIndex,
    stepCount: steps.length,
    title,
    isSuperset: activeStep.length > 1,
    entries: activeStep.map((e) => ({
      exerciseId: e.exerciseId,
      name: exMap[e.exerciseId]?.name || "Exercise",
      angle: e.angle,
      sets: e.sets,
    })),
  };
}

export async function readFocusSnapshot(storage, exercises) {
  const pointer = await readFocusPointer(storage);
  if (!pointer) return null;
  const [workouts, groupSupersets] = await Promise.all([readWorkouts(storage), readGroupSupersets(storage)]);
  return resolveSnapshot(workouts, pointer, groupSupersets, exercises);
}

async function mutateAndSnapshot(storage, exercises, mutate) {
  const [workouts, pointer] = await Promise.all([readWorkouts(storage), readFocusPointer(storage)]);
  if (!pointer) return null;
  const next = mutate(workouts, pointer);
  if (next !== workouts) await writeWorkouts(storage, next);
  const groupSupersets = await readGroupSupersets(storage);
  return resolveSnapshot(next, pointer, groupSupersets, exercises);
}

export async function focusAdjustReps(storage, exercises, setId, delta) {
  return mutateAndSnapshot(storage, exercises, (workouts, pointer) => {
    const workout = (workouts[pointer.dateKey] || []).find((w) => w.id === pointer.workoutId);
    if (!workout) return workouts;
    const exerciseId = findExerciseIdForSet(workout, setId);
    const set = findSet(workout, setId);
    if (!exerciseId || !set) return workouts;
    const nextReps = String(Math.max(0, (parseInt(set.reps, 10) || 0) + delta));
    return mutations.updateSet(workouts, pointer.dateKey, pointer.workoutId, exerciseId, setId, "reps", nextReps);
  });
}

export async function focusAdjustWeight(storage, exercises, setId, delta) {
  const unit = await readUnit(storage);
  return mutateAndSnapshot(storage, exercises, (workouts, pointer) => {
    const workout = (workouts[pointer.dateKey] || []).find((w) => w.id === pointer.workoutId);
    if (!workout) return workouts;
    const exerciseId = findExerciseIdForSet(workout, setId);
    const set = findSet(workout, setId);
    if (!exerciseId || !set) return workouts;
    const nextWeight = String(Math.max(0, (parseFloat(set.weight) || 0) + delta));
    return mutations.updateSet(workouts, pointer.dateKey, pointer.workoutId, exerciseId, setId, "weight", nextWeight, unit);
  });
}

export async function focusAddSet(storage, exercises, exerciseId) {
  const unit = await readUnit(storage);
  return mutateAndSnapshot(storage, exercises, (workouts, pointer) => {
    const workout = (workouts[pointer.dateKey] || []).find((w) => w.id === pointer.workoutId);
    if (!workout) return workouts;
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) return workouts;
    const last = entry.sets[entry.sets.length - 1];
    const preset = last ? { reps: last.reps, weight: last.weight, time: last.time, speed: last.speed } : undefined;
    return mutations.addSet(workouts, pointer.dateKey, pointer.workoutId, exerciseId, mutations.generateId, preset, unit);
  });
}

export async function focusToggleWarmup(storage, exercises, setId) {
  return mutateAndSnapshot(storage, exercises, (workouts, pointer) => {
    const workout = (workouts[pointer.dateKey] || []).find((w) => w.id === pointer.workoutId);
    if (!workout) return workouts;
    const exerciseId = findExerciseIdForSet(workout, setId);
    const set = findSet(workout, setId);
    if (!exerciseId || !set) return workouts;
    return mutations.updateSet(workouts, pointer.dateKey, pointer.workoutId, exerciseId, setId, "warmup", !set.warmup);
  });
}

export async function focusRemoveSet(storage, exercises, setId) {
  return mutateAndSnapshot(storage, exercises, (workouts, pointer) => {
    const workout = (workouts[pointer.dateKey] || []).find((w) => w.id === pointer.workoutId);
    if (!workout) return workouts;
    const exerciseId = findExerciseIdForSet(workout, setId);
    if (!exerciseId) return workouts;
    return mutations.removeSet(workouts, pointer.dateKey, pointer.workoutId, exerciseId, setId);
  });
}

// direction: -1 (prev) | 1 (next). Advancing a step changes what's
// "focused," so — like ExerciseFocusScreen persisting on in-app step
// change — this writes the pointer forward too, not just the workout data.
export async function focusNavigateStep(storage, exercises, direction) {
  const [workouts, pointer, groupSupersets] = await Promise.all([
    readWorkouts(storage),
    readFocusPointer(storage),
    readGroupSupersets(storage),
  ]);
  if (!pointer) return null;
  const dayWorkouts = workouts[pointer.dateKey] || [];
  const workout = dayWorkouts.find((w) => w.id === pointer.workoutId);
  if (!workout) return null;
  const steps = buildSteps(workout.entries, groupSupersets);
  if (steps.length === 0) return null;
  const currentIndex = steps.findIndex((step) => step.some((e) => e.exerciseId === pointer.exerciseId));
  const clampedCurrent = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = Math.max(0, Math.min(steps.length - 1, clampedCurrent + direction));
  const nextPointer = { ...pointer, exerciseId: steps[nextIndex][0].exerciseId, updatedAt: Date.now() };
  await storage.setItem(FOCUS_POINTER_KEY, JSON.stringify(nextPointer));
  return resolveSnapshot(workouts, nextPointer, groupSupersets, exercises);
}
