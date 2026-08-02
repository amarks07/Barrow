"use client";

// CRUD for reusable exercise-list templates, plus turning an already-logged
// day into a new template.
export function useTemplateActions({ setTemplates, setWorkouts, setSelectedTemplateId, workouts }) {
  const createTemplate = (name, exerciseIds) => {
    setTemplates((prev) => [...prev, { id: `tpl-${Date.now()}`, name, exerciseIds }]);
  };

  // Turns a day's already-logged exercises into a reusable template — only
  // relevant when that day wasn't built from a template in the first place.
  const saveWorkoutAsTemplate = (dateKey, name) => {
    const workout = workouts[dateKey];
    if (!workout || workout.entries.length === 0) return;
    const newTplId = `tpl-${Date.now()}`;
    setTemplates((prev) => [...prev, { id: newTplId, name, exerciseIds: workout.entries.map((e) => e.exerciseId) }]);
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], templateIds: [...(prev[dateKey].templateIds || []), newTplId] },
    }));
  };

  const deleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelectedTemplateId((cur) => (cur === id ? null : cur));
  };

  const addExerciseToTemplate = (templateId, exId) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId && !t.exerciseIds.includes(exId) ? { ...t, exerciseIds: [...t.exerciseIds, exId] } : t))
    );

  const removeExerciseFromTemplate = (templateId, exId) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, exerciseIds: t.exerciseIds.filter((id) => id !== exId) } : t))
    );

  return { createTemplate, saveWorkoutAsTemplate, deleteTemplate, addExerciseToTemplate, removeExerciseFromTemplate };
}
