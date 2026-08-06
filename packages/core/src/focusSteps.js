// Groups a workout's entries into "steps" for the focus view — a superset's
// entries (already stored contiguously) collapse into one step so they show
// together on a single screen. When groupSupersets is false (the
// "Separate" preference), every entry gets its own step, superset or not.
//
// Shared between the in-app Focus flow (ExerciseFocusView) and the headless
// widget/notification renderers, so both agree on what "step 2 of 5" means.
export function buildSteps(entries, groupSupersets) {
  if (!groupSupersets) return entries.map((e) => [e]);
  const steps = [];
  let i = 0;
  while (i < entries.length) {
    const supersetId = entries[i].supersetId;
    if (supersetId) {
      const group = [];
      while (i < entries.length && entries[i].supersetId === supersetId) {
        group.push(entries[i]);
        i += 1;
      }
      steps.push(group);
    } else {
      steps.push([entries[i]]);
      i += 1;
    }
  }
  return steps;
}
