// Registry of trackable set fields a custom exercise can be built from (see
// AddCustomExerciseModal's field picker). `key` matches the property name on
// a set object (workoutMutations.js `addSet`/`updateSet`); `name` is the
// user-facing label in the field picker. Order here is display order
// everywhere fields are rendered (FieldsRow, setSummary).
export const FIELD_DEFS = [
  { key: "weight", name: "Weight" },
  { key: "reps", name: "Reps" },
  { key: "time", name: "Minutes" },
  { key: "speed", name: "Speed" },
  { key: "distance", name: "Distance" },
  { key: "calories", name: "Calories" },
  { key: "rpe", name: "RPE" },
];

export const FIELD_KEYS = FIELD_DEFS.map((f) => f.key);
