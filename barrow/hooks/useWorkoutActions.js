"use client";

// Mutations for a single day's workout: renaming it, adding/removing/swapping
// exercises, editing sets, and pulling a template's exercise list into it.
export function useWorkoutActions({ selectedDate, setWorkouts, templates, exercises, unit, nextId }) {
  const ensureWorkout = (dateKey, updater) => {
    setWorkouts((prev) => {
      const current = prev[dateKey] || { name: "Workout", entries: [], templateIds: [] };
      return { ...prev, [dateKey]: updater(current) };
    });
  };

  // A fresh entry for an exercise with angle variants (flat/incline/decline
  // bench press) starts on the first angle; everything else has none.
  const makeEntry = (exId) => {
    const angles = exercises.find((e) => e.id === exId)?.angles;
    return { exerciseId: exId, sets: [], ...(angles ? { angle: angles[0] } : {}) };
  };

  return {
    onRename: (name) => ensureWorkout(selectedDate, (w) => ({ ...w, name })),

    onAddExercise: (exId) =>
      ensureWorkout(selectedDate, (w) =>
        w.entries.some((e) => e.exerciseId === exId)
          ? w
          : { ...w, entries: [...w.entries, makeEntry(exId)] }
      ),

    onRemoveExercise: (exId) =>
      ensureWorkout(selectedDate, (w) => ({ ...w, entries: w.entries.filter((e) => e.exerciseId !== exId) })),

    // Swaps one exercise for another on this day only — the template (and
    // any other day that used it) is untouched. New exercise starts fresh.
    onSwapExercise: (oldExId, newExId) =>
      ensureWorkout(selectedDate, (w) => {
        if (oldExId === newExId) return w;
        const alreadyUsed = w.entries.some((e) => e.exerciseId === newExId);
        if (alreadyUsed) return w;
        return { ...w, entries: w.entries.map((e) => (e.exerciseId === oldExId ? makeEntry(newExId) : e)) };
      }),

    // Changes the flat/incline/decline angle on an already-added entry.
    onSetAngle: (exId, angle) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) => (e.exerciseId === exId ? { ...e, angle } : e)),
      })),

    onAddSet: (exId, preset) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) =>
          e.exerciseId === exId
            ? {
                ...e,
                sets: [
                  ...e.sets,
                  {
                    id: nextId(),
                    reps: preset?.reps ?? "",
                    weight: preset?.weight ?? "",
                    time: preset?.time ?? "",
                    speed: preset?.speed ?? "",
                    unit,
                  },
                ],
              }
            : e
        ),
      })),

    onUpdateSet: (exId, setId, field, value) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) =>
          e.exerciseId === exId
            ? {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId
                    ? field === "weight" || field === "speed"
                      ? { ...s, [field]: value, unit }
                      : { ...s, [field]: value }
                    : s
                ),
              }
            : e
        ),
      })),

    onRemoveSet: (exId, setId) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) => (e.exerciseId === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)),
      })),

    onApplyTemplate: (tplId) => {
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) return;
      ensureWorkout(selectedDate, (w) => {
        const existingIds = new Set(w.entries.map((e) => e.exerciseId));
        const newEntries = tpl.exerciseIds.filter((id) => !existingIds.has(id)).map(makeEntry);
        const templateIds = (w.templateIds || []).includes(tplId) ? w.templateIds : [...(w.templateIds || []), tplId];
        return { ...w, entries: [...w.entries, ...newEntries], templateIds };
      });
    },
  };
}
