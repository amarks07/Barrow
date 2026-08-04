"use client";

import { pruneGroups } from "../lib/supersets";

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

  return { createTemplate, saveWorkoutAsTemplate, deleteTemplate, renameTemplate, addExerciseToTemplate, removeExerciseFromTemplate };
}
