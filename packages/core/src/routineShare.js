import { slug } from "./slug";

export const ROUTINE_SHARE_TYPE = "barrow-routine";
export const ROUTINE_SHARE_VERSION = 1;

// Turns a routine + the app's current exercise list into a compact,
// portable object. Built-in exercises travel as just name+category — the
// receiving device has the same seed catalog (SEED_EXERCISES ids are
// slug(name), see constants.js), so it's re-resolved there rather than
// carried by id. Custom exercises aren't portable by id, so they carry
// their full definition instead.
export function buildRoutineShare(routine, exercises) {
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const list = routine.exerciseIds.map((id) => exMap[id]).filter(Boolean);
  const indexOf = Object.fromEntries(list.map((ex, i) => [ex.id, i]));

  return {
    t: ROUTINE_SHARE_TYPE,
    v: ROUTINE_SHARE_VERSION,
    n: routine.name,
    e: list.map((ex) => ({
      n: ex.name,
      c: ex.category,
      ...(ex.custom ? { custom: true, m: ex.muscle, f: ex.fields, s: ex.setFormat } : {}),
    })),
    g: (routine.supersets || []).map((group) => group.map((id) => indexOf[id]).filter((i) => i !== undefined)),
  };
}

// Parses+validates a share payload (raw JSON text or an already-parsed
// object, since it comes from either a scanned QR string or a read file).
// Throws a message fit to show the user directly — used to reject
// malformed files or QR codes that aren't a Barrow routine at all.
export function parseRoutineShare(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new Error("That doesn't look like a Barrow routine file.");
  }
  if (!data || data.t !== ROUTINE_SHARE_TYPE || typeof data.n !== "string" || !Array.isArray(data.e)) {
    throw new Error("That doesn't look like a Barrow routine file.");
  }
  return data;
}

// Resolves a parsed share payload against this device's exercise list.
// Never mutates `exercises` — returns everything the caller needs to apply
// the import in one shot: the routine to create, plus any custom exercises
// that need to be added alongside it first.
//
// Matching order per entry: an existing built-in with the same id
// (slug(name)), else an existing custom with the same name+category
// (so re-importing the same routine twice doesn't create duplicates), else
// a brand new custom exercise queued in `newExercises`.
export function resolveRoutineShare(data, exercises) {
  const newExercises = [];

  const resolvedIds = data.e.map((entry) => {
    const builtinId = slug(entry.n);
    const builtin = !entry.custom && exercises.find((e) => e.id === builtinId && !e.custom);
    if (builtin) return builtin.id;

    const existingCustom = exercises.find((e) => e.custom && e.name === entry.n && e.category === entry.c);
    if (existingCustom) return existingCustom.id;

    const pending = newExercises.find((e) => e.name === entry.n && e.category === entry.c);
    if (pending) return pending.id;

    const id = `custom-${slug(entry.n)}-${Date.now()}-${newExercises.length}`;
    newExercises.push({
      id,
      name: entry.n,
      category: entry.c || "Full Body",
      muscle: entry.m || undefined,
      custom: true,
      fields: entry.f || ["weight", "reps"],
      setFormat: entry.s || "sets",
    });
    return id;
  });

  const supersets = (data.g || [])
    .map((group) => group.map((i) => resolvedIds[i]).filter(Boolean))
    .filter((g) => g.length >= 2);

  return { name: data.n, exerciseIds: resolvedIds, supersets, newExercises };
}
