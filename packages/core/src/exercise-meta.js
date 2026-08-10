// The small "Chest · Upper Chest · custom" line shown under an exercise's
// name — category, specific muscle (when it adds information beyond the
// category), and custom flag.
export function exerciseMeta(ex) {
  if (ex.type === "stretch") {
    const n = ex.stretches?.length || 0;
    return `${n} pose${n === 1 ? "" : "s"}`;
  }
  const muscle = ex.muscle && ex.muscle !== ex.category ? ex.muscle : null;
  return [ex.category, muscle, ex.custom ? "custom" : null].filter(Boolean).join(" · ");
}
