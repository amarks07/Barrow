import { clearSingletonGroups, groupContiguous } from "../supersets";
import { setAngle, addSet, updateSet, removeSet } from "../workoutMutations";

// Mutations for one already-selected workout: renaming it, adding/removing/
// swapping exercises, editing sets, and pulling a template's exercise list
// into it. Creating/deleting whole workouts for a day lives in useDayWorkouts.
export function useWorkoutActions({ selectedDate, selectedWorkoutId, setWorkouts, templates, exercises, unit, nextId }) {
  const ensureWorkout = (updater) => {
    setWorkouts((prev) => {
      const dayWorkouts = prev[selectedDate] || [];
      const idx = dayWorkouts.findIndex((w) => w.id === selectedWorkoutId);
      if (idx === -1) return prev;
      const updated = [...dayWorkouts];
      updated[idx] = updater(updated[idx]);
      return { ...prev, [selectedDate]: updated };
    });
  };

  // A fresh entry for an exercise with angle variants (flat/incline/decline
  // bench press) starts on the first angle; everything else has none.
  const makeEntry = (exId) => {
    const angles = exercises.find((e) => e.id === exId)?.angles;
    return { exerciseId: exId, sets: [], ...(angles ? { angle: angles[0] } : {}) };
  };

  return {
    onRename: (name) => ensureWorkout((w) => ({ ...w, name })),

    onAddExercise: (exId) =>
      ensureWorkout((w) =>
        w.entries.some((e) => e.exerciseId === exId)
          ? w
          : { ...w, entries: [...w.entries, makeEntry(exId)] }
      ),

    onRemoveExercise: (exId) =>
      ensureWorkout((w) => {
        const entries = w.entries.filter((e) => e.exerciseId !== exId);
        return { ...w, entries: clearSingletonGroups(entries) };
      }),

    // Drag-to-reorder: moves the entry for draggedExId to sit right before
    // targetExId. If the dragged entry is part of a superset, its whole
    // group moves together as one block instead of just that one entry.
    onReorderExercise: (draggedExId, targetExId) =>
      ensureWorkout((w) => {
        const entries = w.entries;
        const dragged = entries.find((e) => e.exerciseId === draggedExId);
        if (!dragged) return w;
        const blockIds = dragged.supersetId
          ? entries.filter((e) => e.supersetId === dragged.supersetId).map((e) => e.exerciseId)
          : [draggedExId];
        if (blockIds.includes(targetExId)) return w;
        const block = entries.filter((e) => blockIds.includes(e.exerciseId));
        const remaining = entries.filter((e) => !blockIds.includes(e.exerciseId));
        let insertAt = remaining.findIndex((e) => e.exerciseId === targetExId);
        if (insertAt === -1) insertAt = remaining.length;
        return { ...w, entries: [...remaining.slice(0, insertAt), ...block, ...remaining.slice(insertAt)] };
      }),

    // Groups the given exercises into a superset: they move to sit
    // contiguously (starting where the first of them currently is, keeping
    // the others' relative order) and get tagged with a shared supersetId so
    // they render as a connected unit and drag/reorder as one block.
    onCreateSuperset: (exIds) =>
      ensureWorkout((w) => {
        if (exIds.length < 2) return w;
        const reordered = groupContiguous(w.entries, exIds, (e) => e.exerciseId);
        const groupSet = new Set(exIds);
        const supersetId = nextId();
        const entries = reordered.map((e) => (groupSet.has(e.exerciseId) ? { ...e, supersetId } : e));
        return { ...w, entries };
      }),

    // Dissolves a superset back into standalone entries — clears supersetId
    // on every entry that shares it, leaving their order/sets untouched.
    onUngroupSuperset: (supersetId) =>
      ensureWorkout((w) => ({
        ...w,
        entries: w.entries.map((e) => (e.supersetId === supersetId ? { ...e, supersetId: undefined } : e)),
      })),

    // Swaps one exercise for another on this workout only — the template
    // (and any other workout that used it) is untouched. New exercise
    // starts fresh, but keeps its predecessor's spot in any superset.
    onSwapExercise: (oldExId, newExId) =>
      ensureWorkout((w) => {
        if (oldExId === newExId) return w;
        const alreadyUsed = w.entries.some((e) => e.exerciseId === newExId);
        if (alreadyUsed) return w;
        return {
          ...w,
          entries: w.entries.map((e) =>
            e.exerciseId === oldExId ? { ...makeEntry(newExId), supersetId: e.supersetId } : e
          ),
        };
      }),

    // Changes the flat/incline/decline angle on an already-added entry.
    // Delegates to workoutMutations' pure transforms — the same functions
    // the widget/notification headless handlers call directly against
    // AsyncStorage — so there's exactly one implementation of each, not two
    // that could drift apart.
    onSetAngle: (exId, angle) => setWorkouts((prev) => setAngle(prev, selectedDate, selectedWorkoutId, exId, angle)),

    onAddSet: (exId, preset) =>
      setWorkouts((prev) => addSet(prev, selectedDate, selectedWorkoutId, exId, nextId, preset, unit)),

    onUpdateSet: (exId, setId, field, value) =>
      setWorkouts((prev) => updateSet(prev, selectedDate, selectedWorkoutId, exId, setId, field, value, unit)),

    onRemoveSet: (exId, setId) => setWorkouts((prev) => removeSet(prev, selectedDate, selectedWorkoutId, exId, setId)),

    onApplyTemplate: (tplId) => {
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) return;
      ensureWorkout((w) => {
        const existingIds = new Set(w.entries.map((e) => e.exerciseId));
        const newIds = tpl.exerciseIds.filter((id) => !existingIds.has(id));
        const newEntries = newIds.map(makeEntry);
        // Carry the template's superset groupings over to the entries that
        // actually made it in (a group could be partially skipped if some of
        // its exercises were already in the workout).
        const newIdSet = new Set(newIds);
        (tpl.supersets || []).forEach((group) => {
          const present = group.filter((id) => newIdSet.has(id));
          if (present.length < 2) return;
          const groupSet = new Set(present);
          const supersetId = nextId();
          newEntries.forEach((e, i) => {
            if (groupSet.has(e.exerciseId)) newEntries[i] = { ...e, supersetId };
          });
        });
        const templateIds = (w.templateIds || []).includes(tplId) ? w.templateIds : [...(w.templateIds || []), tplId];
        return { ...w, entries: [...w.entries, ...newEntries], templateIds };
      });
    },
  };
}
