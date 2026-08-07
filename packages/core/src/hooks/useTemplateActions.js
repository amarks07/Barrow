import { groupContiguous, pruneGroups } from "../supersets";

// CRUD for reusable exercise-list templates, plus turning an already-logged
// day into a new template.
export function useTemplateActions({ setTemplates, setWorkouts, setSelectedTemplateId, workouts }) {
  const createTemplate = (name, exerciseIds, supersets = []) => {
    setTemplates((prev) => [...prev, { id: `tpl-${Date.now()}`, name, exerciseIds, supersets }]);
  };

  // Turns an already-logged workout's exercises into a reusable template —
  // only relevant when that workout wasn't built from a template already.
  // Any superset grouping on the workout carries over to the template.
  const saveWorkoutAsTemplate = (dateKey, workoutId, name) => {
    const workout = (workouts[dateKey] || []).find((w) => w.id === workoutId);
    if (!workout || workout.entries.length === 0) return;
    const newTplId = `tpl-${Date.now()}`;
    const groupsById = {};
    workout.entries.forEach((e) => {
      if (!e.supersetId) return;
      (groupsById[e.supersetId] ||= []).push(e.exerciseId);
    });
    const supersets = Object.values(groupsById).filter((g) => g.length >= 2);
    setTemplates((prev) => [
      ...prev,
      { id: newTplId, name, exerciseIds: workout.entries.map((e) => e.exerciseId), supersets },
    ]);
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].map((w) => (w.id === workoutId ? { ...w, templateIds: [...(w.templateIds || []), newTplId] } : w)),
    }));
  };

  // Overwrites an existing template's exercise list/order/supersets with
  // what's currently in the given workout — same derivation as
  // saveWorkoutAsTemplate above, but replacing the linked template in place
  // instead of minting a new one, so no workout.templateIds bookkeeping is
  // needed (the link already exists).
  const updateTemplateFromWorkout = (templateId, dateKey, workoutId) => {
    const workout = (workouts[dateKey] || []).find((w) => w.id === workoutId);
    if (!workout || workout.entries.length === 0) return;
    const groupsById = {};
    workout.entries.forEach((e) => {
      if (!e.supersetId) return;
      (groupsById[e.supersetId] ||= []).push(e.exerciseId);
    });
    const supersets = Object.values(groupsById).filter((g) => g.length >= 2);
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, exerciseIds: workout.entries.map((e) => e.exerciseId), supersets } : t
      )
    );
  };

  const deleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelectedTemplateId((cur) => (cur === id ? null : cur));
  };

  const renameTemplate = (id, name) =>
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));

  const addExerciseToTemplate = (templateId, exId) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId && !t.exerciseIds.includes(exId) ? { ...t, exerciseIds: [...t.exerciseIds, exId] } : t))
    );

  const removeExerciseFromTemplate = (templateId, exId) =>
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        const exerciseIds = t.exerciseIds.filter((id) => id !== exId);
        return { ...t, exerciseIds, supersets: pruneGroups(t.supersets || [], exerciseIds) };
      })
    );

  // Drag-to-reorder: moves the exercise for draggedExId to sit right before
  // targetExId. If it's part of a superset, its whole group moves together
  // as one block instead of just that one exercise — same block-move
  // semantics as useWorkoutActions' onReorderExercise.
  const reorderTemplateExercise = (templateId, draggedExId, targetExId) =>
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        const groupIds = (t.supersets || []).find((g) => g.includes(draggedExId));
        const blockIds = groupIds || [draggedExId];
        if (blockIds.includes(targetExId)) return t;
        const block = t.exerciseIds.filter((id) => blockIds.includes(id));
        const remaining = t.exerciseIds.filter((id) => !blockIds.includes(id));
        let insertAt = remaining.indexOf(targetExId);
        if (insertAt === -1) insertAt = remaining.length;
        return { ...t, exerciseIds: [...remaining.slice(0, insertAt), ...block, ...remaining.slice(insertAt)] };
      })
    );

  // Groups the given exercises into a superset: they move to sit
  // contiguously (starting where the first of them currently is) and the
  // group is recorded in `supersets`.
  const createTemplateSuperset = (templateId, exIds) =>
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId || exIds.length < 2) return t;
        return {
          ...t,
          exerciseIds: groupContiguous(t.exerciseIds, exIds, (id) => id),
          supersets: [...(t.supersets || []), exIds],
        };
      })
    );

  // Dissolves a superset back into standalone exercises, leaving their
  // order untouched.
  const ungroupTemplateSuperset = (templateId, groupIndex) =>
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, supersets: (t.supersets || []).filter((_, i) => i !== groupIndex) } : t
      )
    );

  return {
    createTemplate,
    saveWorkoutAsTemplate,
    updateTemplateFromWorkout,
    deleteTemplate,
    renameTemplate,
    addExerciseToTemplate,
    removeExerciseFromTemplate,
    reorderTemplateExercise,
    createTemplateSuperset,
    ungroupTemplateSuperset,
  };
}
