// Standard plate sizes, heaviest first, used to greedily fill each side of
// a barbell. Separate sets per unit since kg plates don't just convert 1:1
// from the lb set (a 20kg/1.25kg plate has no clean lb equivalent, and
// vice versa) — gyms stock one set or the other, not a mix.
const PLATES_LB = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export const DEFAULT_BAR_WEIGHT = { lb: 45, kg: 20 };

// Floating-point drift guard for the repeated subtraction below (e.g. three
// 2.5s off a kg total can land on 7.500000000000001 instead of 7.5).
const EPS = 1e-6;

// Greedily fills each side of the bar with the largest plates that still
// fit, for the weight-entry keyboard accessory's calculator. Returns the
// weight actually resting outside the bar (`perSide` before plates),
// the plates chosen, and any `remainder` that couldn't be matched exactly
// (e.g. a target that isn't reachable with the available plate sizes).
export function calcPlateBreakdown(weight, unit, barWeight = DEFAULT_BAR_WEIGHT[unit] ?? 45) {
  const target = parseFloat(weight);
  if (!Number.isFinite(target) || target <= 0) {
    return { barWeight, perSide: 0, plates: [], remainder: 0 };
  }

  const plateSizes = unit === "kg" ? PLATES_KG : PLATES_LB;
  const perSide = Math.max(0, (target - barWeight) / 2);
  let remaining = perSide;
  const plates = [];

  for (const size of plateSizes) {
    let count = 0;
    while (remaining - size >= -EPS) {
      remaining -= size;
      count++;
    }
    if (count > 0) plates.push({ size, count });
  }

  return { barWeight, perSide, plates, remainder: Math.max(0, remaining) };
}
