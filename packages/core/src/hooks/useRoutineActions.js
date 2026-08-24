import { groupContiguous, pruneGroups } from "../supersets";

// CRUD for reusable exercise-list routines, plus turning an already-logged
// day into a new routine.
export function useRoutineActions({ setRoutines, setWorkouts, setSelectedRoutineId, workouts }) {
  const createRoutine = (name, exerciseIds, supersets = [], repRanges = {}) => {
    setRoutines((prev) => [...prev, { id: `rtn-${Date.now()}`, name, exerciseIds, supersets, repRanges }]);
  };

  // Turns an already-logged workout's exercises into a reusable routine —
  // only relevant when that workout wasn't built from a routine already.
  // Any superset grouping on the workout carries over to the routine.
  const saveWorkoutAsRoutine = (dateKey, workoutId, name) => {
    const workout = (workouts[dateKey] || []).find((w) => w.id === workoutId);
    if (!workout || workout.entries.length === 0) return;
    const newRoutineId = `rtn-${Date.now()}`;
    const groupsById = {};
    workout.entries.forEach((e) => {
      if (!e.supersetId) return;
      (groupsById[e.supersetId] ||= []).push(e.exerciseId);
    });
    const supersets = Object.values(groupsById).filter((g) => g.length >= 2);
    setRoutines((prev) => [
      ...prev,
      { id: newRoutineId, name, exerciseIds: workout.entries.map((e) => e.exerciseId), supersets },
    ]);
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].map((w) => (w.id === workoutId ? { ...w, routineIds: [...(w.routineIds || []), newRoutineId] } : w)),
    }));
  };

  // Overwrites an existing routine's exercise list/order/supersets with
  // what's currently in the given workout — same derivation as
  // saveWorkoutAsRoutine above, but replacing the linked routine in place
  // instead of minting a new one, so no workout.routineIds bookkeeping is
  // needed (the link already exists).
  const updateRoutineFromWorkout = (routineId, dateKey, workoutId) => {
    const workout = (workouts[dateKey] || []).find((w) => w.id === workoutId);
    if (!workout || workout.entries.length === 0) return;
    const groupsById = {};
    workout.entries.forEach((e) => {
      if (!e.supersetId) return;
      (groupsById[e.supersetId] ||= []).push(e.exerciseId);
    });
    const supersets = Object.values(groupsById).filter((g) => g.length >= 2);
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId ? { ...r, exerciseIds: workout.entries.map((e) => e.exerciseId), supersets } : r
      )
    );
  };

  const deleteRoutine = (id) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    setSelectedRoutineId((cur) => (cur === id ? null : cur));
  };

  const renameRoutine = (id, name) =>
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));

  const addExerciseToRoutine = (routineId, exId) =>
    setRoutines((prev) =>
      prev.map((r) => (r.id === routineId && !r.exerciseIds.includes(exId) ? { ...r, exerciseIds: [...r.exerciseIds, exId] } : r))
    );

  const removeExerciseFromRoutine = (routineId, exId) =>
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== routineId) return r;
        const exerciseIds = r.exerciseIds.filter((id) => id !== exId);
        const { [exId]: _removed, ...repRanges } = r.repRanges || {};
        return { ...r, exerciseIds, supersets: pruneGroups(r.supersets || [], exerciseIds), repRanges };
      })
    );

  // Sets (or, passing null for both, clears) the target rep range shown
  // under one exercise in a routine — feeds getRecommendation/getRepRange
  // when a workout built from this routine is being logged, taking priority
  // over the history-derived range.
  const setRoutineRepRange = (routineId, exId, min, max) =>
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== routineId) return r;
        if (min == null && max == null) {
          const { [exId]: _removed, ...repRanges } = r.repRanges || {};
          return { ...r, repRanges };
        }
        return { ...r, repRanges: { ...(r.repRanges || {}), [exId]: { min, max } } };
      })
    );

  // Drag-to-reorder: moves the exercise for draggedExId to sit right before
  // targetExId. If it's part of a superset, its whole group moves together
  // as one block instead of just that one exercise — same block-move
  // semantics as useWorkoutActions' onReorderExercise.
  const reorderRoutineExercise = (routineId, draggedExId, targetExId) =>
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== routineId) return r;
        const groupIds = (r.supersets || []).find((g) => g.includes(draggedExId));
        const blockIds = groupIds || [draggedExId];
        if (blockIds.includes(targetExId)) return r;
        const block = r.exerciseIds.filter((id) => blockIds.includes(id));
        const remaining = r.exerciseIds.filter((id) => !blockIds.includes(id));
        let insertAt = remaining.indexOf(targetExId);
        if (insertAt === -1) insertAt = remaining.length;
        return { ...r, exerciseIds: [...remaining.slice(0, insertAt), ...block, ...remaining.slice(insertAt)] };
      })
    );

  // Groups the given exercises into a superset: they move to sit
  // contiguously (starting where the first of them currently is) and the
  // group is recorded in `supersets`.
  const createRoutineSuperset = (routineId, exIds) =>
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== routineId || exIds.length < 2) return r;
        return {
          ...r,
          exerciseIds: groupContiguous(r.exerciseIds, exIds, (id) => id),
          supersets: [...(r.supersets || []), exIds],
        };
      })
    );

  // Dissolves a superset back into standalone exercises, leaving their
  // order untouched.
  const ungroupRoutineSuperset = (routineId, groupIndex) =>
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId ? { ...r, supersets: (r.supersets || []).filter((_, i) => i !== groupIndex) } : r
      )
    );

  return {
    createRoutine,
    saveWorkoutAsRoutine,
    updateRoutineFromWorkout,
    deleteRoutine,
    renameRoutine,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
    reorderRoutineExercise,
    createRoutineSuperset,
    ungroupRoutineSuperset,
    setRoutineRepRange,
  };
}
