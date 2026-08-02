"use client";

// CRUD for reusable exercise-list templates, plus turning an already-logged
// day into a new template.
export function useTemplateActions({ setTemplates, setWorkouts, setSelectedTemplateId, workouts }) {
  const createTemplate = (name, exerciseIds) => {
    setTemplates((prev) => [...prev, { id: `tpl-${Date.now()}`, name, exerciseIds }]);
  };

  // Turns an already-logged workout's exercises into a reusable template —
  // only relevant when that workout wasn't built from a template already.
  const saveWorkoutAsTemplate = (dateKey, workoutId, name) => {
    const workout = (workouts[dateKey] || []).find((w) => w.id === workoutId);
    if (!workout || workout.entries.length === 0) return;
    const newTplId = `tpl-${Date.now()}`;
    setTemplates((prev) => [...prev, { id: newTplId, name, exerciseIds: workout.entries.map((e) => e.exerciseId) }]);
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].map((w) => (w.id === workoutId ? { ...w, templateIds: [...(w.templateIds || []), newTplId] } : w)),
    }));
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
      prev.map((t) => (t.id === templateId ? { ...t, exerciseIds: t.exerciseIds.filter((id) => id !== exId) } : t))
    );

  return { createTemplate, saveWorkoutAsTemplate, deleteTemplate, renameTemplate, addExerciseToTemplate, removeExerciseFromTemplate };
}
