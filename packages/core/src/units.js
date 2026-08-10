const LB_PER_KG = 2.20462;
const KMH_PER_MPH = 1.60934;

export const roundHalf = (n) => Math.round(n * 2) / 2;

export function convertWeight(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * LB_PER_KG : num / LB_PER_KG;
  return roundHalf(converted);
}

// Cardio speed reuses the same lb/kg toggle as an imperial/metric preference:
// "lb" system displays mph, "kg" system displays km/h.
export function convertSpeed(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * KMH_PER_MPH : num / KMH_PER_MPH;
  return roundHalf(converted);
}

// Distance (km/mi) converts with the exact same scalar and kg/lb-system
// convention as speed (km/h/mph) — the km-per-mile factor doesn't care
// whether there's a "per hour" on it — but rounds to the nearest 0.01
// instead of convertSpeed's nearest 0.5: a speed can round to the nearest
// half unit without anyone noticing, but a distance rounded that coarsely
// would visibly mangle a run (5 km would show as 3.5 mi instead of ~3.11).
export function convertDistance(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * KMH_PER_MPH : num / KMH_PER_MPH;
  return Math.round(converted * 100) / 100;
}

export const fmtNum = (n) => {
  if (n === "" || n === null || n === undefined) return "–";
  const num = typeof n === "number" ? n : parseFloat(n);
  if (Number.isNaN(num)) return "–";
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};
