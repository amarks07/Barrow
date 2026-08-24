import { slug } from "./slug";
import { buildShareLink, unwrapShareLink } from "./shareLink";

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

// What actually goes into the routine QR code: buildRoutineShare's JSON
// wrapped in a barrow:// deep link, so scanning it with the phone's own
// camera app (not just Barrow's in-app scanner) opens the app straight to
// importing it — see useShareDeepLink, the receiving end.
export function buildRoutineShareLink(routine, exercises) {
  return buildShareLink("routine", buildRoutineShare(routine, exercises));
}

// Parses+validates a share payload (raw JSON/CSV text, a barrow://routine
// deep link, or an already-parsed object — it comes from a scanned QR
// string, a read file, or the deep-link handler). Throws a message fit to
// show the user directly — used to reject malformed files or QR codes that
// aren't a Barrow routine at all.
export function parseRoutineShare(raw) {
  const text = typeof raw === "string" ? raw.trim() : null;
  if (text && text.startsWith(CSV_HEADER.join(","))) {
    return parseRoutineShareCSV(text);
  }

  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(unwrapShareLink(raw)) : raw;
  } catch {
    throw new Error("That doesn't look like a Barrow routine file.");
  }
  if (!data || data.t !== ROUTINE_SHARE_TYPE || typeof data.n !== "string" || !Array.isArray(data.e)) {
    throw new Error("That doesn't look like a Barrow routine file.");
  }
  return data;
}

// CSV form of the same share payload — one row per exercise, opened
// natively by spreadsheet apps and pasteable as plain text, unlike the JSON
// form. Superset membership is carried as a shared group number per row
// instead of the JSON form's index arrays. The QR code still uses the more
// compact JSON form (buildRoutineShareLink) since repeating the routine name
// on every row would blow past the QR size limit sooner.
const CSV_HEADER = ["name", "exercise", "category", "superset", "custom", "muscle", "fields", "setFormat"];

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvSplitLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

export function buildRoutineShareCSV(routine, exercises) {
  const share = buildRoutineShare(routine, exercises);
  const groupOf = new Map();
  share.g.forEach((group, gi) => group.forEach((idx) => groupOf.set(idx, gi + 1)));

  const rows = share.e.map((ex, i) => [
    share.n,
    ex.n,
    ex.c || "",
    groupOf.has(i) ? String(groupOf.get(i)) : "",
    ex.custom ? "true" : "",
    ex.custom && ex.m ? ex.m : "",
    ex.custom && ex.f ? ex.f.join("|") : "",
    ex.custom && ex.s ? ex.s : "",
  ]);

  return [CSV_HEADER, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function parseRoutineShareCSV(text) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.length > 0);
  const dataLines = lines.slice(1);
  if (dataLines.length === 0) {
    throw new Error("That doesn't look like a Barrow routine file.");
  }

  const groups = new Map();
  const e = dataLines.map((line, i) => {
    const [, exercise, category, superset, custom, muscle, fields, setFormat] = csvSplitLine(line);
    if (superset) {
      if (!groups.has(superset)) groups.set(superset, []);
      groups.get(superset).push(i);
    }
    return {
      n: exercise,
      c: category || undefined,
      ...(custom === "true"
        ? { custom: true, m: muscle || undefined, f: fields ? fields.split("|") : undefined, s: setFormat || undefined }
        : {}),
    };
  });

  const n = csvSplitLine(dataLines[0])[0];
  if (!n || !e.length || e.some((entry) => !entry.n)) {
    throw new Error("That doesn't look like a Barrow routine file.");
  }
  const g = Array.from(groups.values()).filter((grp) => grp.length >= 2);

  return { t: ROUTINE_SHARE_TYPE, v: ROUTINE_SHARE_VERSION, n, e, g };
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
