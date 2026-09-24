import { slug } from "../slug";

export function useExerciseActions({ setExercises, setExerciseNotes, setExerciseFieldOverrides }) {
  const addCustomExercise = (name, category, muscle, fields, setFormat, hasAngles) => {
    const id = `custom-${slug(name)}-${Date.now()}`;
    const exercise = {
      id,
      name,
      category,
      muscle: muscle || undefined,
      custom: true,
      fields,
      setFormat,
      // Mirrors the shape SEED_EXERCISES gives Bench Press/Dumbbell Bench
      // Press (see ANGLE_VARIANTS in constants.js) — every consumer of
      // `angles` (AngleToggle, makeEntry's default-angle seeding, history)
      // keys off truthiness alone, so this needs no other special-casing.
      ...(hasAngles ? { angles: ["Flat", "Incline", "Decline"] } : {}),
    };
    setExercises((prev) => [...prev, exercise]);
    return exercise;
  };

  const addStretchRoutine = (name, stretches) => {
    const id = `stretch-${slug(name)}-${Date.now()}`;
    const exercise = { id, name, category: "Stretching", custom: true, type: "stretch", stretches };
    setExercises((prev) => [...prev, exercise]);
    return exercise;
  };

  const updateStretchRoutine = (id, name, stretches) => {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, name, stretches } : e)));
  };

  const deleteExercise = (id) => setExercises((prev) => prev.filter((e) => e.id !== id));

  // Notes about the exercise itself (form cues, reminders) rather than any
  // one day's instance of it — kept in a separate id-keyed map instead of on
  // the exercise object because built-in exercises are reconstructed fresh
  // from SEED_EXERCISES on every load (see reconcileExercises), which would
  // silently discard a note stored directly on one.
  const setExerciseNote = (id, note) => setExerciseNotes((prev) => ({ ...prev, [id]: note }));

  // Custom exercises are edited in place, same as updateStretchRoutine
  // above. Built-ins can't be — they'd be wiped by the next reconcile — so
  // their edits go into a separate id-keyed override map, the same
  // workaround setExerciseNote uses for notes.
  const updateExerciseFields = (exercise, fields, setFormat) => {
    if (exercise.custom) {
      setExercises((prev) => prev.map((e) => (e.id === exercise.id ? { ...e, fields, setFormat } : e)));
    } else {
      setExerciseFieldOverrides((prev) => ({ ...prev, [exercise.id]: { fields, setFormat } }));
    }
  };

  return { addCustomExercise, addStretchRoutine, updateStretchRoutine, deleteExercise, setExerciseNote, updateExerciseFields };
}
