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
import { FIELD_KEYS } from "./fieldDefs";
import { migrateWorkouts, dayStatusDots } from "./workouts";
import { addDays, startOfWeek, toKey } from "./date";
import * as mutations from "./workoutMutations";

const WORKOUTS_KEY = "barrow:workouts";
const FOCUS_POINTER_KEY = "barrow:focusPointer";
const SUPERSET_GROUPING_KEY = "barrow:focusSupersetGrouping";
const UNIT_KEY = "barrow:unit";
const WIDGET_NAV_KEY = "barrow:widgetNav";
const WORKOUT_TIMER_STARTED_AT_KEY = "barrow:workoutTimerStartedAt";

// How long an armed "End workout?" stays armed before a tap is treated as a
// fresh arm instead of the confirming tap — mirrors WorkoutTimerBadge's 3s
// in-app auto-disarm, though here it's only re-checked on the next tap or
// redraw rather than reverting live (see widgetEndWorkout).
const CONFIRM_END_WINDOW_MS = 3000;

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

// Flattens a step's entries into the row order every renderer (currently
// just the widget) walks — one header row per entry when the step is a
// superset, then one row per set, or a single placeholder row for a
// set-less entry. This is the unit `scrollOffset` counts in: RemoteViews
// gives no real layout measurement back, so there's no way to know how many
// rows actually fit on screen, only how many rows exist to scroll through.
export function buildFocusRows(entries, isSuperset) {
  const rows = [];
  entries.forEach((entry) => {
    let firstOfEntry = true;
    if (isSuperset) {
      rows.push({ type: "header", exerciseId: entry.exerciseId, firstOfEntry: true });
      firstOfEntry = false;
    }
    if (entry.sets.length === 0) {
      rows.push({ type: "empty", exerciseId: entry.exerciseId, firstOfEntry });
    } else {
      entry.sets.forEach((set) => {
        rows.push({ type: "set", exerciseId: entry.exerciseId, set, firstOfEntry });
        firstOfEntry = false;
      });
    }
  });
  return rows;
}

// Rows moved per SCROLL_UP/SCROLL_DOWN tap (focusScrollSets) — also the
// window size the widget renders per "page" (see FocusWidget.js), so a tap
// always lands exactly on the next/previous page rather than one that
// partially overlaps the last.
export const FOCUS_SCROLL_PAGE_SIZE = 5;

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
  const isSuperset = activeStep.length > 1;
  const entries = activeStep.map((e) => ({
    exerciseId: e.exerciseId,
    name: exMap[e.exerciseId]?.name || "Exercise",
    angle: e.angle,
    sets: e.sets,
  }));
  const rowCount = buildFocusRows(entries, isSuperset).length;
  // Snapped to a page boundary and re-clamped on every read (not just when
  // scrolling), so a set add/remove elsewhere that shrinks the row count
  // can't leave a stale offset mid-page or past the end of the list — the
  // widget always renders a full, aligned page (see FOCUS_SCROLL_PAGE_SIZE).
  const lastPageStart = Math.floor((rowCount - 1) / FOCUS_SCROLL_PAGE_SIZE) * FOCUS_SCROLL_PAGE_SIZE;
  const rawOffset = Math.floor((pointer.scrollOffset || 0) / FOCUS_SCROLL_PAGE_SIZE) * FOCUS_SCROLL_PAGE_SIZE;
  const scrollOffset = Math.max(0, Math.min(rawOffset, lastPageStart));
  return {
    dateKey: pointer.dateKey,
    workoutId: pointer.workoutId,
    stepIndex,
    stepCount: steps.length,
    title,
    isSuperset,
    entries,
    scrollOffset,
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
  const [workouts, pointer] = await Promise.all([readWorkouts(storage), readFocusPointer(storage)]);
  if (!pointer) return null;
  const workout = (workouts[pointer.dateKey] || []).find((w) => w.id === pointer.workoutId);
  if (!workout) return null;
  const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
  if (!entry) return null;
  const last = entry.sets[entry.sets.length - 1];
  const preset = last ? Object.fromEntries(FIELD_KEYS.map((key) => [key, last[key]])) : undefined;
  const next = mutations.addSet(workouts, pointer.dateKey, pointer.workoutId, exerciseId, mutations.generateId, preset, unit);
  if (next !== workouts) await writeWorkouts(storage, next);
  const groupSupersets = await readGroupSupersets(storage);
  // Jump to the last page so the set that was just added is actually
  // visible rather than requiring a manual scroll to find it — an
  // intentionally oversized tentative offset always gets clamped down to
  // the last page's start by resolveSnapshot (see FOCUS_SCROLL_PAGE_SIZE).
  const tentativePointer = { ...pointer, scrollOffset: Number.MAX_SAFE_INTEGER };
  const snapshot = resolveSnapshot(next, tentativePointer, groupSupersets, exercises);
  if (snapshot) await storage.setItem(FOCUS_POINTER_KEY, JSON.stringify({ ...pointer, scrollOffset: snapshot.scrollOffset }));
  return snapshot;
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
  // scrollOffset resets rather than carrying over — a fresh step should
  // always open at the top, not wherever the previous step happened to be
  // scrolled to.
  const nextPointer = { ...pointer, exerciseId: steps[nextIndex][0].exerciseId, scrollOffset: 0, updatedAt: Date.now() };
  await storage.setItem(FOCUS_POINTER_KEY, JSON.stringify(nextPointer));
  return resolveSnapshot(workouts, nextPointer, groupSupersets, exercises);
}

// direction: -1 (up) | 1 (down). The widget's ListWidget compiles to a real
// native ListView (see apps/mobile/src/widget/FocusWidget.js), but swiping
// it on an actual home screen is unreliable in practice — the gesture
// competes with the launcher's own swipe handling and often loses, moving
// the whole widget instead of scrolling the list. These SCROLL_UP/DOWN
// buttons page through rows explicitly instead of depending on that swipe.
export async function focusScrollSets(storage, exercises, direction) {
  const [workouts, pointer, groupSupersets] = await Promise.all([
    readWorkouts(storage),
    readFocusPointer(storage),
    readGroupSupersets(storage),
  ]);
  if (!pointer) return null;
  // resolveSnapshot re-clamps scrollOffset against the real row count, so
  // an out-of-range tentative value here (negative, or past the end) comes
  // back correctly bounded — no need to duplicate step/row resolution here.
  const tentativePointer = { ...pointer, scrollOffset: (pointer.scrollOffset || 0) + direction * FOCUS_SCROLL_PAGE_SIZE };
  const snapshot = resolveSnapshot(workouts, tentativePointer, groupSupersets, exercises);
  if (!snapshot) return null;
  await storage.setItem(FOCUS_POINTER_KEY, JSON.stringify({ ...pointer, scrollOffset: snapshot.scrollOffset }));
  return snapshot;
}

// --- Widget navigation: week strip / day browse / focus editor ------------
//
// barrow:focusPointer (above) is "what's currently being tracked" — set
// implicitly by the app while a workout's timer runs, or explicitly by the
// widget actions below. barrow:widgetNav is a separate concern: "what is
// the widget currently showing," which can be browsing a week/day with no
// pointer involved at all. Keeping these independent means a user idly
// paging through past weeks in the widget never gets yanked into the step
// editor just because the app started timing a workout elsewhere — the
// app's own pointer writes (DayScreen.js, ExerciseFocusScreen.js) never
// touch barrow:widgetNav.

async function readWidgetNavRaw(storage) {
  const raw = await storage.getItem(WIDGET_NAV_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function writeWidgetNav(storage, nav) {
  await storage.setItem(WIDGET_NAV_KEY, JSON.stringify(nav));
}

async function readWorkoutTimerStartedAt(storage) {
  const raw = await storage.getItem(WORKOUT_TIMER_STARTED_AT_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function writeWorkoutTimerStartedAt(storage, value) {
  if (value == null) await storage.removeItem(WORKOUT_TIMER_STARTED_AT_KEY);
  else await storage.setItem(WORKOUT_TIMER_STARTED_AT_KEY, JSON.stringify(value));
}

async function writeFocusPointer(storage, pointer) {
  await storage.setItem(FOCUS_POINTER_KEY, JSON.stringify(pointer));
}

async function clearFocusPointer(storage) {
  await storage.removeItem(FOCUS_POINTER_KEY);
}

function isConfirmArmed(nav) {
  return !!(nav.confirmingEnd && nav.confirmingEndAt && Date.now() - nav.confirmingEndAt < CONFIRM_END_WINDOW_MS);
}

// First-ever read defaults to "focus" if a pointer already resolves (an
// upgrading user mid-workout shouldn't lose their view when this ships),
// else "week" centered on today. Every read after that returns exactly
// what a widget action last wrote.
export async function readWidgetNav(storage) {
  const existing = await readWidgetNavRaw(storage);
  if (existing) return existing;
  const pointer = await readFocusPointer(storage);
  const todayKey = toKey(new Date());
  const nav = {
    screen: pointer ? "focus" : "week",
    weekCursor: startOfWeek(todayKey),
    dateKey: null,
    confirmingEnd: false,
    confirmingEndAt: null,
  };
  await writeWidgetNav(storage, nav);
  return nav;
}

function buildWeekSummary(workouts, weekCursor) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dateKey = addDays(weekCursor, i);
    days.push({ dateKey, dots: dayStatusDots(workouts[dateKey] || []) });
  }
  return { weekCursor, days };
}

function buildDaySummary(dayWorkouts, dateKey, pointer, workoutTimerStartedAt) {
  const statuses = dayStatusDots(dayWorkouts);
  const runningWorkoutId = workoutTimerStartedAt && pointer?.dateKey === dateKey ? pointer.workoutId : null;
  return {
    dateKey,
    workouts: dayWorkouts.map((w, i) => ({
      id: w.id,
      entryCount: w.entries.length,
      setCount: w.entries.reduce((sum, e) => sum + e.sets.length, 0),
      status: statuses[i],
      isRunning: w.id === runningWorkoutId,
      startedAt: w.startedAt || null,
      endedAt: w.endedAt || null,
    })),
  };
}

// Single entry point the widget task handler and refreshFocusWidget both
// call after any nav/pointer mutation — reads nav + workouts + timer state
// once and resolves exactly what should render. `resumable` (a focus
// snapshot, or null) drives the "Resume workout" pill shown from week/day
// whenever a pointer currently resolves but that screen isn't "focus".
export async function resolveWidgetState(storage, exercises) {
  const [nav, workouts, pointer, groupSupersets, workoutTimerStartedAt] = await Promise.all([
    readWidgetNav(storage),
    readWorkouts(storage),
    readFocusPointer(storage),
    readGroupSupersets(storage),
    readWorkoutTimerStartedAt(storage),
  ]);

  const resumable = resolveSnapshot(workouts, pointer, groupSupersets, exercises);

  if (nav.screen === "focus") {
    if (resumable) return { screen: "focus", snapshot: resumable, workoutTimerStartedAt, confirmingEnd: isConfirmArmed(nav) };
    // Pointer no longer resolves (workout deleted, or its timer ended
    // elsewhere) — fall back to the week strip instead of a dead-end empty
    // screen, and persist the correction so the next render doesn't retry.
    const correctedNav = { ...nav, screen: "week", dateKey: null };
    await writeWidgetNav(storage, correctedNav);
    return { screen: "week", ...buildWeekSummary(workouts, correctedNav.weekCursor), resumable: null };
  }

  if (nav.screen === "day" && nav.dateKey) {
    return {
      screen: "day",
      ...buildDaySummary(workouts[nav.dateKey] || [], nav.dateKey, pointer, workoutTimerStartedAt),
      confirmingEnd: isConfirmArmed(nav),
      resumable,
    };
  }

  return { screen: "week", ...buildWeekSummary(workouts, nav.weekCursor), resumable };
}

export async function widgetShiftWeek(storage, exercises, direction) {
  const nav = await readWidgetNav(storage);
  await writeWidgetNav(storage, { ...nav, screen: "week", weekCursor: addDays(nav.weekCursor, direction * 7), dateKey: null });
  return resolveWidgetState(storage, exercises);
}

export async function widgetSelectDay(storage, exercises, dateKey) {
  const nav = await readWidgetNav(storage);
  await writeWidgetNav(storage, { ...nav, screen: "day", dateKey, weekCursor: startOfWeek(dateKey) });
  return resolveWidgetState(storage, exercises);
}

export async function widgetBackToWeek(storage, exercises) {
  const nav = await readWidgetNav(storage);
  await writeWidgetNav(storage, { ...nav, screen: "week" });
  return resolveWidgetState(storage, exercises);
}

export async function widgetShiftDay(storage, exercises, direction) {
  const nav = await readWidgetNav(storage);
  if (!nav.dateKey) return resolveWidgetState(storage, exercises);
  const dateKey = addDays(nav.dateKey, direction);
  await writeWidgetNav(storage, { ...nav, dateKey, weekCursor: startOfWeek(dateKey) });
  return resolveWidgetState(storage, exercises);
}

// Points the pointer at an existing workout that already has exercises
// (an entry-less workout has nothing for the step editor to show) and
// switches to it — the widget's "jump into the workout from here."
export async function widgetOpenWorkout(storage, exercises, dateKey, workoutId) {
  const workouts = await readWorkouts(storage);
  const workout = (workouts[dateKey] || []).find((w) => w.id === workoutId);
  if (!workout || workout.entries.length === 0) return resolveWidgetState(storage, exercises);
  await writeFocusPointer(storage, {
    dateKey,
    workoutId,
    exerciseId: workout.entries[0].exerciseId,
    scrollOffset: 0,
    updatedAt: Date.now(),
  });
  const nav = await readWidgetNav(storage);
  await writeWidgetNav(storage, { ...nav, screen: "focus" });
  return resolveWidgetState(storage, exercises);
}

// Mirrors WorkoutTimerControl's in-app "Start workout": resumes the day's
// last workout if one exists (same "resume latest, or start fresh" rule as
// AppStateProvider's getOrCreateWorkoutForDate), else creates a fresh one,
// stamps startedAt, and starts the global timer. Lands on the step editor
// only if there's something to show there — an entry-less workout stays on
// the day view with the timer now visibly running.
export async function widgetStartWorkout(storage, exercises, dateKey) {
  const workouts = await readWorkouts(storage);
  const existing = workouts[dateKey] || [];
  let workout = existing[existing.length - 1];
  let nextWorkouts = workouts;
  if (!workout) {
    workout = { id: mutations.generateId(), entries: [], routineIds: [] };
    nextWorkouts = { ...workouts, [dateKey]: [...existing, workout] };
  }
  const now = Date.now();
  nextWorkouts = mutations.patchWorkout(nextWorkouts, dateKey, workout.id, { startedAt: now });
  await writeWorkouts(storage, nextWorkouts);
  await writeWorkoutTimerStartedAt(storage, now);
  await writeFocusPointer(storage, {
    dateKey,
    workoutId: workout.id,
    exerciseId: workout.entries[0]?.exerciseId ?? null,
    scrollOffset: 0,
    updatedAt: now,
  });
  const nav = await readWidgetNav(storage);
  await writeWidgetNav(storage, { ...nav, screen: workout.entries.length > 0 ? "focus" : "day", dateKey });
  return resolveWidgetState(storage, exercises);
}

// Mirrors WorkoutTimerBadge's arm-then-confirm "End workout": the first tap
// only arms it (confirmingEnd/confirmingEndAt on widgetNav, since there's no
// live in-widget timer to auto-revert it — see isConfirmArmed/
// CONFIRM_END_WINDOW_MS); the confirming tap actually stamps endedAt, stops
// the global timer, and clears the pointer.
export async function widgetEndWorkout(storage, exercises) {
  const nav = await readWidgetNav(storage);
  if (!isConfirmArmed(nav)) {
    await writeWidgetNav(storage, { ...nav, confirmingEnd: true, confirmingEndAt: Date.now() });
    return resolveWidgetState(storage, exercises);
  }
  const pointer = await readFocusPointer(storage);
  await writeWorkoutTimerStartedAt(storage, null);
  if (pointer?.dateKey && pointer?.workoutId) {
    const workouts = await readWorkouts(storage);
    const next = mutations.patchWorkout(workouts, pointer.dateKey, pointer.workoutId, { endedAt: Date.now() });
    if (next !== workouts) await writeWorkouts(storage, next);
  }
  await clearFocusPointer(storage);
  const dateKey = pointer?.dateKey || nav.dateKey || toKey(new Date());
  await writeWidgetNav(storage, {
    ...nav,
    screen: "day",
    dateKey,
    weekCursor: startOfWeek(dateKey),
    confirmingEnd: false,
    confirmingEndAt: null,
  });
  return resolveWidgetState(storage, exercises);
}

// Backs the "Resume workout" pill shown from week/day when a pointer
// currently resolves but isn't what's on screen — jumps to it without
// touching the pointer itself.
export async function widgetResumeWorkout(storage, exercises) {
  const nav = await readWidgetNav(storage);
  await writeWidgetNav(storage, { ...nav, screen: "focus" });
  return resolveWidgetState(storage, exercises);
}

// Back from the step editor: clears the pointer only if no timer is
// running (mirrors DayScreen.js's own unmount cleanup), so leaving the
// editor never silently drops a workout still being actively timed — that
// one just stays reachable via the Resume pill until the timer ends.
export async function widgetBackFromFocus(storage, exercises) {
  const [pointer, workoutTimerStartedAt] = await Promise.all([readFocusPointer(storage), readWorkoutTimerStartedAt(storage)]);
  if (!workoutTimerStartedAt && pointer) await clearFocusPointer(storage);
  const nav = await readWidgetNav(storage);
  const dateKey = pointer?.dateKey || nav.dateKey || toKey(new Date());
  await writeWidgetNav(storage, { ...nav, screen: "day", dateKey, weekCursor: startOfWeek(dateKey) });
  return resolveWidgetState(storage, exercises);
}
