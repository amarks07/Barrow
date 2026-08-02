"use client";

import { slug } from "../lib/slug";

export function useExerciseActions({ setExercises }) {
  const addCustomExercise = (name, category) => {
    const id = `custom-${slug(name)}-${Date.now()}`;
    setExercises((prev) => [...prev, { id, name, category, custom: true }]);
  };

  const deleteExercise = (id) => setExercises((prev) => prev.filter((e) => e.id !== id));

  return { addCustomExercise, deleteExercise };
}
