import { slug } from "../slug";

export function useExerciseActions({ setExercises }) {
  const addCustomExercise = (name, category, muscle, fields, setFormat) => {
    const id = `custom-${slug(name)}-${Date.now()}`;
    const exercise = { id, name, category, muscle: muscle || undefined, custom: true, fields, setFormat };
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

  return { addCustomExercise, addStretchRoutine, updateStretchRoutine, deleteExercise };
}
